import { Injectable } from '@nestjs/common';
import {
  applyStorageCap,
  calculateProducedAmount,
  calculateResourceProduction,
  calculateStorageCapacity,
} from '@island-empires/game-engine';
import {
  BUILDING_TYPES,
  EVENT_TYPES,
  LUXURY_PRODUCTION_BUILDINGS,
  NOTIFICATION_THROTTLE_SECONDS,
  NOTIFICATION_TYPES,
  PRODUCTION_BOOST_BUILDINGS,
  RESOURCE_PRODUCTION_CONFIG,
  RESOURCE_TYPES,
  STORAGE_CONFIG,
  UNIT_CONFIG,
  type UnitType,
} from '@island-empires/config';
import type {
  CityResourcesResponse,
  ResourceProduction,
  StorageSummary,
} from '@island-empires/shared-types';
import { PrismaService } from '../../database/prisma.service';
import { LiveEventsService } from '../live-events/live-events.service';

type ProductionBoostBuilding = {
  buildingType: string;
  level: number;
};
type CityUnitForUpkeep = {
  unitType: string;
  quantity: number;
};
type UpkeepByResource = Record<keyof ResourceProductionMap, number>;
type ResourceProductionMap = {
  wood: number;
  gold: number;
  marble: number;
  wine: number;
  crystal: number;
  sulfur: number;
};

export function calculateCityProductionBoosts(input: {
  buildings: ProductionBoostBuilding[];
  islandLuxuryResource?: string | null;
}): {
  woodProductionBoostPercent: number;
  luxuryProductionBoostPercent: number;
} {
  const levelByType = new Map(
    input.buildings.map((building) => [building.buildingType, Math.max(0, building.level)]),
  );
  const forestersLevel = levelByType.get(BUILDING_TYPES.FORESTERS_HOUSE) ?? 0;
  const luxuryBuildingType =
    input.islandLuxuryResource && input.islandLuxuryResource in LUXURY_PRODUCTION_BUILDINGS
      ? LUXURY_PRODUCTION_BUILDINGS[
          input.islandLuxuryResource as keyof typeof LUXURY_PRODUCTION_BUILDINGS
        ]
      : null;
  const luxuryLevel = luxuryBuildingType ? (levelByType.get(luxuryBuildingType) ?? 0) : 0;

  return {
    woodProductionBoostPercent:
      forestersLevel * PRODUCTION_BOOST_BUILDINGS[BUILDING_TYPES.FORESTERS_HOUSE].percentPerLevel,
    luxuryProductionBoostPercent: luxuryBuildingType
      ? luxuryLevel * PRODUCTION_BOOST_BUILDINGS[luxuryBuildingType].percentPerLevel
      : 0,
  };
}

@Injectable()
export class ResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly liveEventsService: LiveEventsService,
  ) {}

  async recalculateResources(cityId: string): Promise<{
    resources: CityResourcesResponse;
    production: ResourceProduction;
    storage: StorageSummary;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const [city, resourceRow, assignment, warehouse, luxuryExtractor, productionBoostBuildings, cityUnits] =
        await Promise.all([
          tx.city.findUniqueOrThrow({ where: { id: cityId }, include: { island: true } }),
          tx.cityResource.findUniqueOrThrow({ where: { cityId } }),
          tx.cityWorkerAssignment.findUniqueOrThrow({ where: { cityId } }),
          tx.cityBuilding.findUnique({
            where: {
              cityId_buildingType: { cityId, buildingType: BUILDING_TYPES.WAREHOUSE },
            },
          }),
          tx.cityBuilding.findUnique({
            where: {
              cityId_buildingType: { cityId, buildingType: BUILDING_TYPES.LUXURY_EXTRACTOR },
            },
          }),
          tx.cityBuilding.findMany({
            where: {
              cityId,
              buildingType: {
                in: [BUILDING_TYPES.FORESTERS_HOUSE, ...Object.values(LUXURY_PRODUCTION_BUILDINGS)],
              },
            },
            select: { buildingType: true, level: true },
          }),
          tx.cityUnit.findMany({ where: { cityId }, select: { unitType: true, quantity: true } }),
        ]);

      const now = new Date();
      const productionBoosts = calculateCityProductionBoosts({
        buildings: productionBoostBuildings,
        islandLuxuryResource: city.island?.luxuryResource ?? null,
      });

      const production = calculateResourceProduction({
        baseWoodPerHour: RESOURCE_PRODUCTION_CONFIG.baseWoodPerHour,
        baseGoldPerHour: RESOURCE_PRODUCTION_CONFIG.baseGoldPerHour,
        woodWorkers: assignment.woodWorkers,
        goldWorkers: assignment.goldWorkers,
        luxuryWorkers: assignment.luxuryWorkers,
        woodPerWorkerPerHour: RESOURCE_PRODUCTION_CONFIG.woodPerWorkerPerHour,
        goldPerWorkerPerHour: RESOURCE_PRODUCTION_CONFIG.goldPerWorkerPerHour,
        luxuryPerWorkerPerHour: RESOURCE_PRODUCTION_CONFIG.luxuryPerWorkerPerHour,
        luxuryExtractorLevel: luxuryExtractor?.level ?? 0,
        islandLuxuryResource: city.island?.luxuryResource ?? null,
        ...productionBoosts,
      });
      const eventBonusPercent = await this.liveEventsService.getActiveBonusPercent(
        city.worldId,
        EVENT_TYPES.RESOURCE_BONUS,
      );
      const effectiveProduction =
        eventBonusPercent > 0
          ? {
              woodPerHour: Math.floor(production.woodPerHour * (1 + eventBonusPercent / 100)),
              goldPerHour: Math.floor(production.goldPerHour * (1 + eventBonusPercent / 100)),
              marblePerHour: Math.floor(production.marblePerHour * (1 + eventBonusPercent / 100)),
              winePerHour: Math.floor(production.winePerHour * (1 + eventBonusPercent / 100)),
              crystalPerHour: Math.floor(production.crystalPerHour * (1 + eventBonusPercent / 100)),
              sulfurPerHour: Math.floor(production.sulfurPerHour * (1 + eventBonusPercent / 100)),
            }
          : production;
      const netProduction = this.applyArmyUpkeep(
        effectiveProduction,
        this.calculateArmyUpkeep(cityUnits),
      );

      const capacityPerResource = calculateStorageCapacity({
        baseStorage: STORAGE_CONFIG.baseStorage,
        warehouseLevel: warehouse?.level ?? 0,
        storagePerWarehouseLevel: STORAGE_CONFIG.storagePerWarehouseLevel,
      });

      const woodResult = applyStorageCap({
        currentAmount: resourceRow.wood,
        producedAmount: calculateProducedAmount(
          netProduction.woodPerHour,
          resourceRow.lastCalculatedAt,
          now,
        ),
        capacity: capacityPerResource,
      });

      const goldResult = applyStorageCap({
        currentAmount: resourceRow.gold,
        producedAmount: calculateProducedAmount(
          netProduction.goldPerHour,
          resourceRow.lastCalculatedAt,
          now,
        ),
        capacity: capacityPerResource,
      });

      const luxuryResults = {
        marble: applyStorageCap({
          currentAmount: resourceRow.marble,
          producedAmount: calculateProducedAmount(
            netProduction.marblePerHour,
            resourceRow.lastCalculatedAt,
            now,
          ),
          capacity: capacityPerResource,
        }),
        wine: applyStorageCap({
          currentAmount: resourceRow.wine,
          producedAmount: calculateProducedAmount(
            netProduction.winePerHour,
            resourceRow.lastCalculatedAt,
            now,
          ),
          capacity: capacityPerResource,
        }),
        crystal: applyStorageCap({
          currentAmount: resourceRow.crystal,
          producedAmount: calculateProducedAmount(
            netProduction.crystalPerHour,
            resourceRow.lastCalculatedAt,
            now,
          ),
          capacity: capacityPerResource,
        }),
        sulfur: applyStorageCap({
          currentAmount: resourceRow.sulfur,
          producedAmount: calculateProducedAmount(
            netProduction.sulfurPerHour,
            resourceRow.lastCalculatedAt,
            now,
          ),
          capacity: capacityPerResource,
        }),
      };

      const updatedResource = await tx.cityResource.update({
        where: { cityId },
        data: {
          wood: woodResult.newAmount,
          gold: goldResult.newAmount,
          marble: luxuryResults.marble.newAmount,
          wine: luxuryResults.wine.newAmount,
          crystal: luxuryResults.crystal.newAmount,
          sulfur: luxuryResults.sulfur.newAmount,
          lastCalculatedAt: now,
        },
      });

      const transactionsToLog: { resourceType: string; amount: number; balanceAfter: number }[] =
        [];
      if (woodResult.actualProducedAmount !== 0) {
        transactionsToLog.push({
          resourceType: RESOURCE_TYPES.WOOD,
          amount: woodResult.actualProducedAmount,
          balanceAfter: woodResult.newAmount,
        });
      }
      if (goldResult.actualProducedAmount !== 0) {
        transactionsToLog.push({
          resourceType: RESOURCE_TYPES.GOLD,
          amount: goldResult.actualProducedAmount,
          balanceAfter: goldResult.newAmount,
        });
      }
      for (const resourceType of [
        RESOURCE_TYPES.MARBLE,
        RESOURCE_TYPES.WINE,
        RESOURCE_TYPES.CRYSTAL,
        RESOURCE_TYPES.SULFUR,
      ] as const) {
        const result = luxuryResults[resourceType];
        if (result.actualProducedAmount !== 0) {
          transactionsToLog.push({
            resourceType,
            amount: result.actualProducedAmount,
            balanceAfter: result.newAmount,
          });
        }
      }

      await Promise.all(
        transactionsToLog.map((transaction) =>
          tx.resourceTransaction.create({
            data: {
              worldId: city.worldId,
              cityId,
              playerId: city.playerId,
              transactionType: transaction.amount < 0 ? 'unit_upkeep' : 'production',
              resourceType: transaction.resourceType,
              amount: transaction.amount,
              balanceAfter: transaction.balanceAfter,
            },
          }),
        ),
      );
      const productionTransactions = transactionsToLog.filter((transaction) => transaction.amount > 0);
      if (productionTransactions.length > 0) {
        await this.liveEventsService.recordParticipationForActiveEvents({
          tx,
          worldId: city.worldId,
          playerId: city.playerId,
          type: EVENT_TYPES.RESOURCE_BONUS,
        });
      }
      if (transactionsToLog.length > 0) {
        await tx.gameAnalyticsEvent?.create({
          data: {
            worldId: city.worldId,
            playerId: city.playerId,
            eventType: 'resource_balance_changed',
            payload: {
              cityId,
              reason: 'resource_tick',
              changes: transactionsToLog,
              balance: {
                wood: updatedResource.wood,
                gold: updatedResource.gold,
                marble: updatedResource.marble,
                wine: updatedResource.wine,
                crystal: updatedResource.crystal,
                sulfur: updatedResource.sulfur,
              },
            },
          },
        });
      }

      const fullResources: string[] = [];
      if (woodResult.isFull) fullResources.push(RESOURCE_TYPES.WOOD);
      if (goldResult.isFull) fullResources.push(RESOURCE_TYPES.GOLD);
      for (const resourceType of [
        RESOURCE_TYPES.MARBLE,
        RESOURCE_TYPES.WINE,
        RESOURCE_TYPES.CRYSTAL,
        RESOURCE_TYPES.SULFUR,
      ] as const) {
        if (luxuryResults[resourceType].isFull) fullResources.push(resourceType);
      }
      if (fullResources.length > 0) {
        const recentWarehouseWarning = await tx.report.findFirst({
          where: {
            worldId: city.worldId,
            playerId: city.playerId,
            cityId,
            type: 'warehouse_full',
            createdAt: {
              gte: new Date(
                now.getTime() -
                  NOTIFICATION_THROTTLE_SECONDS[NOTIFICATION_TYPES.WAREHOUSE_FULL] * 1000,
              ),
            },
          },
        });
        if (!recentWarehouseWarning) {
          await tx.report.create({
            data: {
              worldId: city.worldId,
              playerId: city.playerId,
              cityId,
              type: 'warehouse_full',
              title: 'Warehouse full',
              message: `${city.name} cannot store more ${fullResources.join(', ')}.`,
              payload: {
                cityId,
                resources: fullResources,
                capacityPerResource,
              },
            },
          });
        }
      }

      return {
        resources: {
          wood: updatedResource.wood,
          gold: updatedResource.gold,
          marble: updatedResource.marble,
          wine: updatedResource.wine,
          crystal: updatedResource.crystal,
          sulfur: updatedResource.sulfur,
          lastCalculatedAt: updatedResource.lastCalculatedAt.toISOString(),
        },
        production: netProduction,
        storage: {
          capacityPerResource,
          fullResources,
        },
      };
    });
  }

  private calculateArmyUpkeep(cityUnits: CityUnitForUpkeep[]): UpkeepByResource {
    const upkeep: UpkeepByResource = {
      wood: 0,
      gold: 0,
      marble: 0,
      wine: 0,
      crystal: 0,
      sulfur: 0,
    };

    for (const cityUnit of cityUnits) {
      const definition = UNIT_CONFIG[cityUnit.unitType as UnitType];
      if (!definition?.upkeep || cityUnit.quantity <= 0) {
        continue;
      }

      upkeep[definition.upkeep.resourceType] +=
        Math.max(0, cityUnit.quantity) * definition.upkeep.amountPerHour;
    }

    return upkeep;
  }

  private applyArmyUpkeep(
    production: ResourceProduction,
    upkeep: UpkeepByResource,
  ): ResourceProduction {
    return {
      woodPerHour: production.woodPerHour - upkeep.wood,
      goldPerHour: production.goldPerHour - upkeep.gold,
      marblePerHour: production.marblePerHour - upkeep.marble,
      winePerHour: production.winePerHour - upkeep.wine,
      crystalPerHour: production.crystalPerHour - upkeep.crystal,
      sulfurPerHour: production.sulfurPerHour - upkeep.sulfur,
    };
  }
}
