import { HttpStatus, Injectable } from '@nestjs/common';
import { ANTI_ABUSE_CONFIG, BUILDING_TYPES, MAP_CONFIG, MARKETPLACE_CONFIG, STORAGE_CONFIG, TRADE_SHIP_CONFIG } from '@island-empires/config';
import {
  calculateMapDistance,
  calculateMarketplaceCapacity,
  calculateMarketplaceTax,
  calculateStorageCapacity,
  calculateTradeTravelTimeSeconds,
  calculateTradeRatioRisk,
  calculateTradeValue,
  calculateTravelTimeSeconds,
  canAcceptMarketplaceOffer,
  canCreateMarketplaceOffer,
  detectSuspiciousTrade,
} from '@island-empires/game-engine';
import type {
  AcceptMarketplaceOfferRequest,
  AcceptMarketplaceOfferResponse,
  CancelMarketplaceOfferResponse,
  CreateMarketplaceOfferRequest,
  CreateMarketplaceOfferResponse,
  MarketplaceOfferListResponse,
  MarketplaceOfferSummary,
  MarketplaceTradeHistoryResponse,
  ResourceBalance,
} from '@island-empires/shared-types';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';
import { AntiAbuseService } from '../anti-abuse/anti-abuse.service';
import { DevelopmentStateService } from '../players/development-state.service';
import { ResourcesService } from '../resources/resources.service';

const RESOURCE_KEYS: Array<keyof ResourceBalance> = ['wood', 'gold', 'marble', 'wine', 'crystal', 'sulfur'];
const ACTIVE_TRADE_STATUSES = ['in_transit'];

type Tx = Record<string, any>;

@Injectable()
export class MarketplaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly developmentStateService: DevelopmentStateService,
    private readonly resourcesService: ResourcesService,
    private readonly antiAbuseService: AntiAbuseService,
  ) {}

  async createOffer(input: CreateMarketplaceOfferRequest): Promise<CreateMarketplaceOfferResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    this.assertResource(input.offeredResource);
    this.assertResource(input.requestedResource);
    if (input.offeredResource === input.requestedResource) {
      throw new ApiErrorException('Offer must exchange different resources.', 'INVALID_TRADE_RESOURCES', HttpStatus.BAD_REQUEST);
    }

    await this.resourcesService.recalculateResources(input.creatorCityId);
    await this.expireOldOffers();
    await this.completeDueTrades();
    const frequency = await this.antiAbuseService.monitorAction({
      worldId: bootstrap.world.id,
      playerId: bootstrap.player.id,
      actionType: 'create_marketplace_offer',
      targetType: 'city',
      targetId: input.creatorCityId,
      payload: {
        offeredResource: input.offeredResource,
        offeredAmount: input.offeredAmount,
        requestedResource: input.requestedResource,
        requestedAmount: input.requestedAmount,
      },
    });
    if (!frequency.allowed) {
      throw new ApiErrorException('Too many actions. Please try again later.', 'RATE_LIMITED', HttpStatus.TOO_MANY_REQUESTS);
    }

    const offer = await this.prisma.$transaction(async (tx) => {
      const db = tx as Tx;
      const city = await db.city.findUnique({
        where: { id: input.creatorCityId },
        include: { island: true, world: true },
      });
      if (!city || city.playerId !== bootstrap.player.id || city.worldId !== bootstrap.world.id) {
        throw new ApiErrorException('Creator city not found.', 'CITY_NOT_FOUND', HttpStatus.NOT_FOUND);
      }
      if (!city.island) {
        throw new ApiErrorException('City must be placed on the world map.', 'CITY_NOT_PLACED_ON_MAP', HttpStatus.CONFLICT);
      }
      await this.assertCitiesNotBlockaded(db, [city.id]);

      const [resources, marketplace, activeOfferCount] = await Promise.all([
        db.cityResource.findUniqueOrThrow({ where: { cityId: city.id } }),
        db.cityBuilding.findUnique({
          where: { cityId_buildingType: { cityId: city.id, buildingType: BUILDING_TYPES.MARKETPLACE } },
        }),
        db.marketplaceOffer.count({
          where: { worldId: city.worldId, creatorPlayerId: city.playerId, status: 'active' },
        }),
      ]);
      const marketplaceLevel = marketplace?.level ?? 0;
      const maxOfferLoad = calculateMarketplaceCapacity({
        marketplaceLevel,
        capacityPerMarketplaceLevel: MARKETPLACE_CONFIG.capacityPerMarketplaceLevel,
      });
      const offeredAmount = Math.floor(input.offeredAmount);
      const requestedAmount = Math.floor(input.requestedAmount);
      const tradeCapacity = await this.getAvailableTradeCapacity(db, city.id, marketplaceLevel);
      const validation = canCreateMarketplaceOffer({
        marketplaceLevel,
        activeOfferCount,
        maxActiveOffers: MARKETPLACE_CONFIG.maxActiveOffersPerPlayer,
        offeredAmount,
        requestedAmount,
        maxOfferLoad,
        hasEnoughResources: resources[input.offeredResource] >= offeredAmount,
      });
      if (!validation.canCreate) {
        throw new ApiErrorException(validation.reason ?? 'Offer cannot be created.', 'MARKETPLACE_OFFER_INVALID', HttpStatus.BAD_REQUEST);
      }
      if (tradeCapacity < offeredAmount) {
        throw new ApiErrorException('Not enough trade ship capacity.', 'TRADE_CAPACITY_UNAVAILABLE', HttpStatus.BAD_REQUEST);
      }

      const updatedResources = await db.cityResource.update({
        where: { cityId: city.id },
        data: { [input.offeredResource]: resources[input.offeredResource] - offeredAmount },
      });
      const expiresAt = new Date(Date.now() + MARKETPLACE_CONFIG.defaultOfferDurationHours * 60 * 60 * 1000);
      const createdOffer = await db.marketplaceOffer.create({
        data: {
          worldId: city.worldId,
          creatorPlayerId: city.playerId,
          creatorCityId: city.id,
          offerType: input.offerType,
          offeredResource: input.offeredResource,
          offeredAmount,
          requestedResource: input.requestedResource,
          requestedAmount,
          expiresAt,
          payload: {
            reservedResource: input.offeredResource,
            reservedAmount: offeredAmount,
            marketplaceLevel,
            maxOfferLoad,
          },
        },
        include: this.offerInclude(),
      });

      await db.resourceTransaction.create({
        data: {
          worldId: city.worldId,
          cityId: city.id,
          playerId: city.playerId,
          transactionType: 'marketplace_offer_reserved',
          resourceType: input.offeredResource,
          amount: -offeredAmount,
          balanceAfter: updatedResources[input.offeredResource],
          referenceType: 'marketplace_offer',
          referenceId: createdOffer.id,
        },
      });
      await db.gameAnalyticsEvent.create({
        data: {
          worldId: city.worldId,
          playerId: city.playerId,
          eventType: 'create_marketplace_offer',
          payload: { offerId: createdOffer.id, offeredAmount, requestedAmount },
        },
      });
      await this.safeCreate(db, 'sensitiveActionAuditLog', {
        worldId: city.worldId,
        playerId: city.playerId,
        cityId: city.id,
        actionType: 'marketplace_offer_created',
        targetType: 'marketplace_offer',
        targetId: createdOffer.id,
        payload: { offeredResource: input.offeredResource, offeredAmount, requestedResource: input.requestedResource, requestedAmount },
      });

      return createdOffer;
    });

    return { offer: this.toOfferSummary(offer) };
  }

  async listOffers(input: {
    offeredResource?: string;
    requestedResource?: string;
    offerType?: string;
    page?: number;
    pageSize?: number;
  }): Promise<MarketplaceOfferListResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.expireOldOffers();
    await this.completeDueTrades();
    const pagination = this.pagination(input);
    const where = {
      worldId: bootstrap.world.id,
      status: 'active',
      ...(this.isResource(input.offeredResource) ? { offeredResource: input.offeredResource } : {}),
      ...(this.isResource(input.requestedResource) ? { requestedResource: input.requestedResource } : {}),
      ...(input.offerType === 'sell_offer' || input.offerType === 'buy_offer' ? { offerType: input.offerType } : {}),
    };
    const [offers, total] = await Promise.all([
      (this.prisma as any).marketplaceOffer.findMany({
        where,
        include: this.offerInclude(),
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      (this.prisma as any).marketplaceOffer.count({ where }),
    ]);

    return { offers: offers.map((offer: any) => this.toOfferSummary(offer)), pagination: { ...pagination, total } };
  }

  async listMyOffers(input: { page?: number; pageSize?: number }): Promise<MarketplaceOfferListResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.expireOldOffers();
    await this.completeDueTrades();
    const pagination = this.pagination(input);
    const where = { worldId: bootstrap.world.id, creatorPlayerId: bootstrap.player.id };
    const [offers, total] = await Promise.all([
      (this.prisma as any).marketplaceOffer.findMany({
        where,
        include: this.offerInclude(),
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      (this.prisma as any).marketplaceOffer.count({ where }),
    ]);

    return { offers: offers.map((offer: any) => this.toOfferSummary(offer)), pagination: { ...pagination, total } };
  }

  async acceptOffer(offerId: string, input: AcceptMarketplaceOfferRequest): Promise<AcceptMarketplaceOfferResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.resourcesService.recalculateResources(input.acceptingCityId);
    await this.expireOldOffers();
    await this.completeDueTrades();
    const frequency = await this.antiAbuseService.monitorAction({
      worldId: bootstrap.world.id,
      playerId: bootstrap.player.id,
      actionType: 'accept_marketplace_offer',
      targetType: 'marketplace_offer',
      targetId: offerId,
      payload: { acceptingCityId: input.acceptingCityId },
    });
    if (!frequency.allowed) {
      throw new ApiErrorException('Too many actions. Please try again later.', 'RATE_LIMITED', HttpStatus.TOO_MANY_REQUESTS);
    }

    const trade = await this.prisma.$transaction(async (tx) => {
      const db = tx as Tx;
      const offer = await db.marketplaceOffer.findUnique({
        where: { id: offerId },
        include: {
          creatorPlayer: true,
          creatorCity: { include: { island: true, world: true } },
        },
      });
      const acceptingCity = await db.city.findUnique({
        where: { id: input.acceptingCityId },
        include: { island: true },
      });
      if (!offer || offer.worldId !== bootstrap.world.id) {
        throw new ApiErrorException('Offer not found.', 'MARKETPLACE_OFFER_NOT_FOUND', HttpStatus.NOT_FOUND);
      }
      if (!acceptingCity || acceptingCity.playerId !== bootstrap.player.id || acceptingCity.worldId !== bootstrap.world.id) {
        throw new ApiErrorException('Accepting city not found.', 'CITY_NOT_FOUND', HttpStatus.NOT_FOUND);
      }
      if (!offer.creatorCity.island || !acceptingCity.island) {
        throw new ApiErrorException('Both cities must be placed on the world map.', 'CITY_NOT_PLACED_ON_MAP', HttpStatus.CONFLICT);
      }
      await this.assertCitiesNotBlockaded(db, [offer.creatorCityId, acceptingCity.id]);

      const [acceptingResources, accepterMarketplace, creatorMarketplace] = await Promise.all([
        db.cityResource.findUniqueOrThrow({ where: { cityId: acceptingCity.id } }),
        db.cityBuilding.findUnique({
          where: { cityId_buildingType: { cityId: acceptingCity.id, buildingType: BUILDING_TYPES.MARKETPLACE } },
        }),
        db.cityBuilding.findUnique({
          where: { cityId_buildingType: { cityId: offer.creatorCityId, buildingType: BUILDING_TYPES.MARKETPLACE } },
        }),
      ]);
      const accepterMarketplaceLevel = accepterMarketplace?.level ?? 0;
      const creatorMarketplaceLevel = creatorMarketplace?.level ?? 0;
      const accepterCapacity = await this.getAvailableTradeCapacity(db, acceptingCity.id, accepterMarketplaceLevel);
      const creatorCapacity = await this.getAvailableTradeCapacity(db, offer.creatorCityId, creatorMarketplaceLevel);
      const validation = canAcceptMarketplaceOffer({
        offerIsActive: offer.status === 'active',
        offerIsExpired: offer.expiresAt <= new Date(),
        accepterIsCreator: offer.creatorPlayerId === bootstrap.player.id,
        accepterHasMarketplace: accepterMarketplaceLevel >= 1,
        accepterHasEnoughResources: acceptingResources[offer.requestedResource] >= offer.requestedAmount,
        hasEnoughTradeCapacity: accepterCapacity >= offer.requestedAmount && creatorCapacity >= offer.offeredAmount,
      });
      if (!validation.canAccept) {
        throw new ApiErrorException(validation.reason ?? 'Offer cannot be accepted.', 'MARKETPLACE_ACCEPT_INVALID', HttpStatus.BAD_REQUEST);
      }

      const distance = calculateMapDistance({
        from: { x: offer.creatorCity.island.x, y: offer.creatorCity.island.y },
        to: { x: acceptingCity.island.x, y: acceptingCity.island.y },
      });
      const normalTravelTimeSeconds = calculateTravelTimeSeconds({
        distance,
        baseSecondsPerDistance: MAP_CONFIG.baseSecondsPerDistance,
        worldSpeed: offer.creatorCity.world.speedTravel,
      });
      const travelTimeSeconds = calculateTradeTravelTimeSeconds({
        normalTravelTimeSeconds,
        tradeTravelMultiplier: MARKETPLACE_CONFIG.tradeTravelMultiplier,
        minTravelTimeSeconds: MARKETPLACE_CONFIG.minTravelTimeSeconds,
      });
      const departureTime = new Date();
      const arrivalTime = new Date(departureTime.getTime() + travelTimeSeconds * 1000);
      const acceptingUpdated = await db.cityResource.update({
        where: { cityId: acceptingCity.id },
        data: { [offer.requestedResource]: acceptingResources[offer.requestedResource] - offer.requestedAmount },
      });
      const updateResult = await db.marketplaceOffer.updateMany({
        where: { id: offer.id, status: 'active' },
        data: {
          status: 'accepted',
          acceptedByPlayerId: acceptingCity.playerId,
          acceptedByCityId: acceptingCity.id,
          acceptedAt: departureTime,
        },
      });
      if (updateResult.count === 0) {
        throw new ApiErrorException('Offer is no longer active.', 'MARKETPLACE_OFFER_NOT_ACTIVE', HttpStatus.CONFLICT);
      }

      await db.resourceTransaction.create({
        data: {
          worldId: acceptingCity.worldId,
          cityId: acceptingCity.id,
          playerId: acceptingCity.playerId,
          transactionType: 'marketplace_offer_payment_reserved',
          resourceType: offer.requestedResource,
          amount: -offer.requestedAmount,
          balanceAfter: acceptingUpdated[offer.requestedResource],
          referenceType: 'marketplace_offer',
          referenceId: offer.id,
        },
      });

      const sellerPlayerId = offer.offerType === 'sell_offer' ? offer.creatorPlayerId : acceptingCity.playerId;
      const buyerPlayerId = offer.offerType === 'sell_offer' ? acceptingCity.playerId : offer.creatorPlayerId;
      const sellerCityId = offer.offerType === 'sell_offer' ? offer.creatorCityId : acceptingCity.id;
      const buyerCityId = offer.offerType === 'sell_offer' ? acceptingCity.id : offer.creatorCityId;
      const movement = await db.movement.create({
        data: {
          worldId: offer.worldId,
          playerId: offer.creatorPlayerId,
          originCityId: offer.creatorCityId,
          destinationCityId: acceptingCity.id,
          destinationIslandId: acceptingCity.islandId,
          destinationSlotIndex: acceptingCity.slotIndex,
          movementType: MARKETPLACE_CONFIG.movementType,
          status: 'in_transit',
          departureTime,
          arrivalTime,
          payload: {
            offerId: offer.id,
            sellerPlayerId,
            buyerPlayerId,
            sellerCityId,
            buyerCityId,
            creatorPlayerId: offer.creatorPlayerId,
            accepterPlayerId: acceptingCity.playerId,
            creatorCityId: offer.creatorCityId,
            accepterCityId: acceptingCity.id,
            resourceFromSeller: offer.offerType === 'sell_offer' ? offer.offeredResource : offer.requestedResource,
            amountFromSeller: offer.offerType === 'sell_offer' ? offer.offeredAmount : offer.requestedAmount,
            resourceFromBuyer: offer.offerType === 'sell_offer' ? offer.requestedResource : offer.offeredResource,
            amountFromBuyer: offer.offerType === 'sell_offer' ? offer.requestedAmount : offer.offeredAmount,
            creatorDeliversResource: offer.offeredResource,
            creatorDeliversAmount: offer.offeredAmount,
            accepterDeliversResource: offer.requestedResource,
            accepterDeliversAmount: offer.requestedAmount,
            taxRate: MARKETPLACE_CONFIG.marketplaceTaxRate,
            travelTimeSeconds,
            creatorShipsUsed: this.calculateShipsUsed(offer.offeredAmount),
            accepterShipsUsed: this.calculateShipsUsed(offer.requestedAmount),
          },
        },
      });
      await db.tradeHistory.create({
        data: {
          worldId: offer.worldId,
          offerId: offer.id,
          sellerPlayerId,
          buyerPlayerId,
          sellerCityId,
          buyerCityId,
          resourceFromSeller: offer.offerType === 'sell_offer' ? offer.offeredResource : offer.requestedResource,
          amountFromSeller: offer.offerType === 'sell_offer' ? offer.offeredAmount : offer.requestedAmount,
          resourceFromBuyer: offer.offerType === 'sell_offer' ? offer.requestedResource : offer.offeredResource,
          amountFromBuyer: offer.offerType === 'sell_offer' ? offer.requestedAmount : offer.offeredAmount,
          movementId: movement.id,
        },
      });
      await this.logSuspiciousSignals(db, offer, acceptingCity.playerId);
      await db.gameAnalyticsEvent.create({
        data: {
          worldId: offer.worldId,
          playerId: acceptingCity.playerId,
          eventType: 'accept_marketplace_offer',
          payload: { offerId: offer.id, movementId: movement.id, creatorPlayerId: offer.creatorPlayerId },
        },
      });
      await this.safeCreate(db, 'sensitiveActionAuditLog', {
        worldId: offer.worldId,
        playerId: acceptingCity.playerId,
        relatedPlayerId: offer.creatorPlayerId,
        cityId: acceptingCity.id,
        actionType: 'marketplace_offer_accepted',
        targetType: 'marketplace_offer',
        targetId: offer.id,
        payload: { movementId: movement.id },
      });

      return { movement };
    });

    return {
      trade: {
        offerId,
        movementId: trade.movement.id,
        status: trade.movement.status,
        arrivalTime: trade.movement.arrivalTime.toISOString(),
        remainingSeconds: Math.max(0, Math.ceil((trade.movement.arrivalTime.getTime() - Date.now()) / 1000)),
      },
    };
  }

  async cancelOffer(offerId: string): Promise<CancelMarketplaceOfferResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.expireOldOffers();
    const status = await this.prisma.$transaction(async (tx) => {
      const db = tx as Tx;
      const offer = await db.marketplaceOffer.findUnique({ where: { id: offerId } });
      if (!offer || offer.worldId !== bootstrap.world.id || offer.creatorPlayerId !== bootstrap.player.id) {
        throw new ApiErrorException('Offer not found.', 'MARKETPLACE_OFFER_NOT_FOUND', HttpStatus.NOT_FOUND);
      }
      if (offer.status !== 'active') {
        throw new ApiErrorException('Only active offers can be cancelled.', 'MARKETPLACE_OFFER_NOT_ACTIVE', HttpStatus.BAD_REQUEST);
      }
      await this.refundOffer(db, offer, 'cancelled', 'marketplace_offer_refunded');
      return 'cancelled' as const;
    });

    return { success: true, status };
  }

  async getTradeHistory(input: { page?: number; pageSize?: number }): Promise<MarketplaceTradeHistoryResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.expireOldOffers();
    await this.completeDueTrades();
    const pagination = this.pagination(input);
    const where = {
      worldId: bootstrap.world.id,
      OR: [{ sellerPlayerId: bootstrap.player.id }, { buyerPlayerId: bootstrap.player.id }],
    };
    const [trades, total] = await Promise.all([
      (this.prisma as any).tradeHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      (this.prisma as any).tradeHistory.count({ where }),
    ]);

    return {
      trades: trades.map((trade: any) => ({
        ...trade,
        completedAt: trade.completedAt?.toISOString() ?? null,
        createdAt: trade.createdAt.toISOString(),
      })),
      pagination: { ...pagination, total },
    };
  }

  async completeDueTrades(): Promise<number> {
    const movements = await (this.prisma as any).movement.findMany({
      where: {
        movementType: MARKETPLACE_CONFIG.movementType,
        status: 'in_transit',
        arrivalTime: { lte: new Date() },
      },
      select: { id: true },
    });
    let completed = 0;
    for (const movement of movements) {
      if (await this.completeTradeMovement(movement.id)) completed += 1;
    }
    return completed;
  }

  async completeTradeMovement(movementId: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const db = tx as Tx;
      const movement = await db.movement.findUnique({
        where: { id: movementId },
        include: { originCity: true, destinationCity: true },
      });
      if (!movement || movement.movementType !== MARKETPLACE_CONFIG.movementType || movement.status !== 'in_transit') {
        return false;
      }
      const payload = movement.payload as any;
      const offer = await db.marketplaceOffer.findUnique({ where: { id: payload.offerId } });
      if (!offer || offer.status === 'completed') return false;
      const blockadeEndsAt = await this.getLatestActiveBlockadeEnd(db, [
        payload.creatorCityId,
        payload.accepterCityId,
      ]);
      if (blockadeEndsAt) {
        await db.movement.update({
          where: { id: movement.id },
          data: { arrivalTime: blockadeEndsAt },
        });
        return false;
      }

      const creatorDelivery = calculateMarketplaceTax({
        amount: payload.creatorDeliversAmount,
        taxRate: payload.taxRate,
      });
      const accepterDelivery = calculateMarketplaceTax({
        amount: payload.accepterDeliversAmount,
        taxRate: payload.taxRate,
      });

      await this.deliverResource(db, {
        worldId: movement.worldId,
        cityId: payload.accepterCityId,
        playerId: payload.accepterPlayerId,
        resourceType: payload.creatorDeliversResource,
        amount: creatorDelivery.amountAfterTax,
        taxAmount: creatorDelivery.taxAmount,
        movementId: movement.id,
      });
      await this.deliverResource(db, {
        worldId: movement.worldId,
        cityId: payload.creatorCityId,
        playerId: payload.creatorPlayerId,
        resourceType: payload.accepterDeliversResource,
        amount: accepterDelivery.amountAfterTax,
        taxAmount: accepterDelivery.taxAmount,
        movementId: movement.id,
      });
      const now = new Date();
      await db.movement.updateMany({
        where: { id: movement.id, status: 'in_transit' },
        data: { status: 'completed', completedAt: now },
      });
      await db.marketplaceOffer.update({
        where: { id: payload.offerId },
        data: { status: 'completed', completedAt: now },
      });
      await db.tradeHistory.updateMany({
        where: { movementId: movement.id },
        data: {
          completedAt: now,
          taxFromSellerSide: calculateMarketplaceTax({ amount: payload.amountFromSeller, taxRate: payload.taxRate }).taxAmount,
          taxFromBuyerSide: calculateMarketplaceTax({ amount: payload.amountFromBuyer, taxRate: payload.taxRate }).taxAmount,
        },
      });
      await this.safeCreate(db, 'sensitiveActionAuditLog', {
        worldId: movement.worldId,
        playerId: payload.creatorPlayerId,
        relatedPlayerId: payload.accepterPlayerId,
        cityId: payload.creatorCityId,
        actionType: 'marketplace_trade_completed',
        targetType: 'movement',
        targetId: movement.id,
        payload: { offerId: payload.offerId },
      });
      await Promise.all([
        db.report.create({
          data: {
            worldId: movement.worldId,
            playerId: payload.creatorPlayerId,
            cityId: payload.creatorCityId,
            type: 'marketplace_trade_completed',
            title: 'Trade completed',
            message: `Marketplace trade for ${payload.creatorDeliversAmount} ${payload.creatorDeliversResource} completed.`,
            payload: { movementId: movement.id, offerId: payload.offerId },
          },
        }),
        db.report.create({
          data: {
            worldId: movement.worldId,
            playerId: payload.accepterPlayerId,
            cityId: payload.accepterCityId,
            type: 'marketplace_trade_completed',
            title: 'Trade completed',
            message: `Marketplace trade for ${payload.accepterDeliversAmount} ${payload.accepterDeliversResource} completed.`,
            payload: { movementId: movement.id, offerId: payload.offerId },
          },
        }),
      ]);
      return true;
    });
  }

  private async expireOldOffers(): Promise<void> {
    const offers = await (this.prisma as any).marketplaceOffer.findMany({
      where: { status: 'active', expiresAt: { lte: new Date() } },
    });
    for (const offer of offers) {
      await this.prisma.$transaction(async (tx) => this.refundOffer(tx as Tx, offer, 'expired', 'marketplace_offer_expired_refund'));
    }
  }

  private async refundOffer(db: Tx, offer: any, status: 'cancelled' | 'expired', transactionType: string): Promise<void> {
    const resources = await db.cityResource.findUniqueOrThrow({ where: { cityId: offer.creatorCityId } });
    const updatedResources = await db.cityResource.update({
      where: { cityId: offer.creatorCityId },
      data: { [offer.offeredResource]: resources[offer.offeredResource] + offer.offeredAmount },
    });
    await db.marketplaceOffer.update({
      where: { id: offer.id },
      data: { status, cancelledAt: status === 'cancelled' ? new Date() : null },
    });
    await db.resourceTransaction.create({
      data: {
        worldId: offer.worldId,
        cityId: offer.creatorCityId,
        playerId: offer.creatorPlayerId,
        transactionType,
        resourceType: offer.offeredResource,
        amount: offer.offeredAmount,
        balanceAfter: updatedResources[offer.offeredResource],
        referenceType: 'marketplace_offer',
        referenceId: offer.id,
      },
    });
  }

  private async deliverResource(db: Tx, input: {
    worldId: string;
    cityId: string;
    playerId: string;
    resourceType: keyof ResourceBalance;
    amount: number;
    taxAmount: number;
    movementId: string;
  }): Promise<void> {
    const [resources, warehouse] = await Promise.all([
      db.cityResource.findUniqueOrThrow({ where: { cityId: input.cityId } }),
      db.cityBuilding.findUnique({
        where: { cityId_buildingType: { cityId: input.cityId, buildingType: BUILDING_TYPES.WAREHOUSE } },
      }),
    ]);
    const storageCapacity = calculateStorageCapacity({
      baseStorage: STORAGE_CONFIG.baseStorage,
      warehouseLevel: warehouse?.level ?? 0,
      storagePerWarehouseLevel: STORAGE_CONFIG.storagePerWarehouseLevel,
    });
    const delivered = Math.min(input.amount, Math.max(0, storageCapacity - resources[input.resourceType]));
    const updated = await db.cityResource.update({
      where: { cityId: input.cityId },
      data: { [input.resourceType]: resources[input.resourceType] + delivered },
    });
    if (delivered > 0) {
      await db.resourceTransaction.create({
        data: {
          worldId: input.worldId,
          cityId: input.cityId,
          playerId: input.playerId,
          transactionType: 'marketplace_trade_received',
          resourceType: input.resourceType,
          amount: delivered,
          balanceAfter: updated[input.resourceType],
          referenceType: 'movement',
          referenceId: input.movementId,
        },
      });
    }
    if (input.taxAmount > 0) {
      await db.resourceTransaction.create({
        data: {
          worldId: input.worldId,
          cityId: input.cityId,
          playerId: input.playerId,
          transactionType: 'marketplace_tax',
          resourceType: input.resourceType,
          amount: -input.taxAmount,
          balanceAfter: updated[input.resourceType],
          referenceType: 'movement',
          referenceId: input.movementId,
        },
      });
    }
  }

  private async logSuspiciousSignals(db: Tx, offer: any, accepterPlayerId: string): Promise<void> {
    const recentTradeCountBetweenPlayers = await db.tradeHistory.count({
      where: {
        worldId: offer.worldId,
        OR: [
          { sellerPlayerId: offer.creatorPlayerId, buyerPlayerId: accepterPlayerId },
          { sellerPlayerId: accepterPlayerId, buyerPlayerId: offer.creatorPlayerId },
        ],
      },
    });
    const signals: Array<{ reason: string; severity: 'low' | 'medium' | 'high' | 'critical' }> = [...detectSuspiciousTrade({
      offeredAmount: offer.offeredAmount,
      requestedAmount: offer.requestedAmount,
      recentTradeCountBetweenPlayers,
      creatorScore: offer.creatorPlayer?.score,
      accepterScore: offer.acceptedByPlayer?.score,
    })];
    const offeredValue = calculateTradeValue({
      resource: offer.offeredResource,
      amount: offer.offeredAmount,
      weights: ANTI_ABUSE_CONFIG.resourceValueWeights,
    });
    const requestedValue = calculateTradeValue({
      resource: offer.requestedResource,
      amount: offer.requestedAmount,
      weights: ANTI_ABUSE_CONFIG.resourceValueWeights,
    });
    const ratioRisk = calculateTradeRatioRisk({
      offeredValue,
      requestedValue,
      thresholds: ANTI_ABUSE_CONFIG.tradeRatioRisk,
    });
    if (ratioRisk.riskLevel !== 'none') {
      signals.push({ reason: 'weighted_extreme_trade_ratio', severity: ratioRisk.riskLevel });
    }
    await Promise.all(
      signals.flatMap((signal) => {
        const signalType = signal.reason.includes('trade_ratio') ? 'resource_pushing' : 'marketplace_abuse';
        const payload = {
          offeredAmount: offer.offeredAmount,
          requestedAmount: offer.requestedAmount,
          offeredValue,
          requestedValue,
          ratio: ratioRisk.ratio,
          recentTradeCountBetweenPlayers,
        };
        return [
          db.suspiciousTradeLog.create({
            data: {
              worldId: offer.worldId,
              offerId: offer.id,
              playerId: offer.creatorPlayerId,
              relatedPlayerId: accepterPlayerId,
              reason: signal.reason,
              severity: signal.severity,
              payload,
            },
          }),
          this.safeCreate(db, 'abuseSignal', {
            worldId: offer.worldId,
            playerId: offer.creatorPlayerId,
            relatedPlayerId: accepterPlayerId,
            signalType,
            severity: signal.severity,
            score: signal.severity === 'critical' ? 95 : signal.severity === 'high' ? 70 : signal.severity === 'medium' ? 35 : 10,
            title: `${signal.severity} marketplace risk`,
            description: signal.reason,
            reason: signal.reason,
            source: 'marketplace',
            targetType: 'marketplace_offer',
            targetId: offer.id,
            payload,
          }),
        ];
      }),
    );
  }

  private async getAvailableTradeCapacity(db: Tx, cityId: string, marketplaceLevel: number): Promise<number> {
    if (marketplaceLevel < 1) return 0;
    const movements = await db.movement.findMany({
      where: {
        movementType: MARKETPLACE_CONFIG.movementType,
        status: { in: ACTIVE_TRADE_STATUSES },
        OR: [{ originCityId: cityId }, { destinationCityId: cityId }],
      },
      select: { originCityId: true, destinationCityId: true, payload: true },
    });
    const busyShips = movements.reduce((sum: number, movement: any) => {
      const payload = movement.payload ?? {};
      if (movement.originCityId === cityId) return sum + (payload.creatorShipsUsed ?? 0);
      if (movement.destinationCityId === cityId) return sum + (payload.accepterShipsUsed ?? 0);
      return sum;
    }, 0);
    return Math.max(0, (TRADE_SHIP_CONFIG.baseShips - busyShips) * TRADE_SHIP_CONFIG.capacityPerShip);
  }

  private async assertCitiesNotBlockaded(db: Tx, cityIds: string[]): Promise<void> {
    const blockade = await db.cityBlockade.findFirst({
      where: {
        targetCityId: { in: cityIds },
        status: 'active',
        endsAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (blockade) {
      throw new ApiErrorException('This city is currently blockaded.', 'CITY_BLOCKADED', HttpStatus.CONFLICT);
    }
  }

  private async getLatestActiveBlockadeEnd(db: Tx, cityIds: string[]): Promise<Date | null> {
    const blockades = await db.cityBlockade.findMany({
      where: {
        targetCityId: { in: cityIds },
        status: 'active',
        endsAt: { gt: new Date() },
      },
      select: { endsAt: true },
      orderBy: { endsAt: 'desc' },
      take: 1,
    });
    return blockades[0]?.endsAt ?? null;
  }

  private calculateShipsUsed(amount: number): number {
    return Math.max(1, Math.ceil(amount / TRADE_SHIP_CONFIG.capacityPerShip));
  }

  private async safeCreate(db: Tx, model: string, data: Record<string, unknown>): Promise<unknown> {
    try {
      const delegate = db[model];
      if (!delegate?.create) return null;
      return await delegate.create({ data });
    } catch {
      return null;
    }
  }

  private offerInclude() {
    return {
      creatorPlayer: true,
      creatorCity: { include: { island: true } },
    };
  }

  private toOfferSummary(offer: any): MarketplaceOfferSummary {
    return {
      id: offer.id,
      offerType: offer.offerType,
      status: offer.status,
      offeredResource: offer.offeredResource,
      offeredAmount: offer.offeredAmount,
      requestedResource: offer.requestedResource,
      requestedAmount: offer.requestedAmount,
      creator: {
        playerId: offer.creatorPlayerId,
        playerName: offer.creatorPlayer?.name ?? 'Unknown player',
        allianceTag: null,
      },
      creatorCity: {
        id: offer.creatorCityId,
        name: offer.creatorCity?.name ?? 'Unknown city',
        x: offer.creatorCity?.island?.x ?? null,
        y: offer.creatorCity?.island?.y ?? null,
      },
      acceptedByPlayerId: offer.acceptedByPlayerId ?? null,
      acceptedByCityId: offer.acceptedByCityId ?? null,
      expiresAt: offer.expiresAt.toISOString(),
      acceptedAt: offer.acceptedAt?.toISOString() ?? null,
      completedAt: offer.completedAt?.toISOString() ?? null,
      cancelledAt: offer.cancelledAt?.toISOString() ?? null,
      createdAt: offer.createdAt.toISOString(),
    };
  }

  private pagination(input: { page?: number; pageSize?: number }): { page: number; pageSize: number } {
    return {
      page: Number.isFinite(input.page) && input.page ? Math.max(1, Math.floor(input.page)) : 1,
      pageSize: Number.isFinite(input.pageSize) && input.pageSize ? Math.max(1, Math.min(100, Math.floor(input.pageSize))) : 20,
    };
  }

  private assertResource(resource: string): asserts resource is keyof ResourceBalance {
    if (!this.isResource(resource)) {
      throw new ApiErrorException('Invalid resource type.', 'INVALID_RESOURCE_TYPE', HttpStatus.BAD_REQUEST);
    }
  }

  private isResource(resource?: string): resource is keyof ResourceBalance {
    return !!resource && RESOURCE_KEYS.includes(resource as keyof ResourceBalance);
  }
}
