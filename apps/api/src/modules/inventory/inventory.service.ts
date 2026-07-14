import { HttpStatus, Injectable } from '@nestjs/common';
import {
  getInventoryItemDefinition,
  INVENTORY_CONFIG,
  INVENTORY_ITEM_CATALOG,
  STORAGE_CONFIG,
  UNIT_CONFIG,
  type InventoryItemSource,
} from '@island-empires/config';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';
import type { AuthContext } from '../auth/auth-context.service';
import type {
  AdminGrantInventoryDto,
  AdminInventoryQueryDto,
  EquipInventoryItemDto,
  InventoryQueryDto,
  UnequipCosmeticDto,
  UseInventoryItemDto,
} from './dto/inventory.dto';

type Db = Record<string, any>;
type InventoryRow = Record<string, any>;

const RESOURCE_KEYS = ['wood', 'gold', 'marble', 'wine', 'crystal', 'sulfur'] as const;
const COSMETIC_SLOTS = ['player_badge', 'avatar_frame', 'city_skin', 'alliance_banner'] as const;

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getInventory(auth: AuthContext, query: InventoryQueryDto) {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? INVENTORY_CONFIG.defaultPageSize);
    const category = query.category && query.category !== 'all' ? query.category : undefined;
    const itemIds = category
      ? INVENTORY_ITEM_CATALOG.filter((item) => item.category === category).map((item) => item.itemId)
      : undefined;
    const where = {
      userId: auth.userId,
      ...(itemIds ? { itemId: { in: itemIds } } : {}),
      status: { in: ['available', 'equipped'] },
    };
    const [rows, total, equipped] = await Promise.all([
      this.db().userInventoryItem.findMany({
        where,
        orderBy: [{ acquiredAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.db().userInventoryItem.count({ where }),
      this.db().equippedCosmetic.findMany({ where: { userId: auth.userId } }),
    ]);
    return {
      items: rows.map((row: InventoryRow) => this.itemSummary(row, equipped)),
      pagination: { page, pageSize, total },
    };
  }

  async getInventoryItem(auth: AuthContext, inventoryItemId: string) {
    const row = await this.findOwnedItem(auth, inventoryItemId);
    const equipped = await this.db().equippedCosmetic.findMany({ where: { userId: auth.userId } });
    return { item: this.itemSummary(row, equipped) };
  }

  async grantInventoryItem(input: {
    userId: string;
    playerId?: string;
    itemId: string;
    quantity: number;
    sourceType: InventoryItemSource;
    sourceId?: string;
    idempotencyKey: string;
    metadata?: unknown;
  }): Promise<void> {
    const definition = this.requireDefinition(input.itemId);
    if (input.quantity < 1) {
      throw new ApiErrorException('Quantity must be positive.', 'INVALID_INVENTORY_QUANTITY', HttpStatus.BAD_REQUEST);
    }
    const sourceId = input.sourceId ?? input.idempotencyKey;
    const existingTransaction = await this.db().inventoryTransaction.findFirst({
      where: {
        userId: input.userId,
        itemId: input.itemId,
        transactionType: { in: ['grant', 'admin_grant'] },
        sourceId: input.idempotencyKey,
      },
    });
    if (existingTransaction) return;

    await this.db().$transaction(async (tx: Db) => {
      const existing = await tx.userInventoryItem.findUnique({
        where: { userId_itemId_sourceId: { userId: input.userId, itemId: input.itemId, sourceId } },
      });
      if (existing) {
        if (definition.stackable) {
          const quantity = Math.min((definition.maxStack ?? 999) as number, existing.quantity + input.quantity);
          const updated = await tx.userInventoryItem.update({
            where: { id: existing.id },
            data: { quantity, status: 'available', metadata: input.metadata as any },
          });
          await this.recordTransaction(tx, input.userId, input.playerId, input.itemId, 'grant', input.quantity, updated.quantity, input.sourceType, input.idempotencyKey, undefined, undefined, input.metadata);
        }
        return;
      }
      const created = await tx.userInventoryItem.create({
        data: {
          userId: input.userId,
          playerId: input.playerId,
          itemId: input.itemId,
          quantity: definition.stackable ? input.quantity : 1,
          sourceType: input.sourceType,
          sourceId,
          metadata: input.metadata as any,
        },
      });
      await this.recordTransaction(tx, input.userId, input.playerId, input.itemId, input.sourceType === 'admin' ? 'admin_grant' : 'grant', created.quantity, created.quantity, input.sourceType, input.idempotencyKey, undefined, undefined, input.metadata);
      await this.auditSensitive(tx, input.userId, input.playerId, 'inventory_item_granted', 'inventory_item', created.id, { itemId: input.itemId, quantity: created.quantity, sourceType: input.sourceType });
    });
  }

  async useInventoryItem(auth: AuthContext, inventoryItemId: string, dto: UseInventoryItemDto) {
    const quantity = Number(dto.quantity ?? 1);
    const row = await this.findOwnedItem(auth, inventoryItemId);
    const definition = this.requireDefinition(row.itemId);
    this.assertUsable(row, definition, quantity);

    if (definition.category === 'resource_pack') {
      await this.applyResourcePack(auth, row, definition, quantity, dto.targetId);
    } else if (definition.category === 'unit_pack') {
      await this.applyUnitPack(auth, row, definition, quantity, dto.targetId);
    } else if (definition.itemId === 'city_rename_token') {
      await this.renameCity(auth, row, quantity, dto.targetId, dto.payload?.newName);
    } else if (definition.itemId === 'player_rename_token') {
      await this.renamePlayer(auth, row, quantity, dto.payload?.newName);
    } else {
      throw new ApiErrorException('This item cannot be used here.', 'INVENTORY_ITEM_CANNOT_BE_USED', HttpStatus.BAD_REQUEST);
    }
    return { success: true };
  }

  async equipInventoryCosmetic(auth: AuthContext, inventoryItemId: string, dto: EquipInventoryItemDto) {
    const row = await this.findOwnedItem(auth, inventoryItemId);
    const definition = this.requireDefinition(row.itemId);
    if (definition.behavior !== 'equippable' || !definition.cosmeticSlot || !COSMETIC_SLOTS.includes(dto.cosmeticSlot as any)) {
      throw new ApiErrorException('This item cannot be equipped.', 'INVENTORY_ITEM_CANNOT_BE_USED', HttpStatus.BAD_REQUEST);
    }
    if (definition.cosmeticSlot !== dto.cosmeticSlot) {
      throw new ApiErrorException('Invalid item target.', 'INVALID_INVENTORY_TARGET', HttpStatus.BAD_REQUEST);
    }
    await this.validateCosmeticTarget(auth, dto.cosmeticSlot, dto.cityId, dto.allianceId);
    await this.db().$transaction(async (tx: Db) => {
      await tx.equippedCosmetic.upsert({
        where: {
          userId_cosmeticSlot_playerId_cityId_allianceId: {
            userId: auth.userId,
            cosmeticSlot: dto.cosmeticSlot,
            playerId: ['player_badge', 'avatar_frame'].includes(dto.cosmeticSlot) ? auth.playerId : null,
            cityId: dto.cityId ?? null,
            allianceId: dto.allianceId ?? null,
          },
        },
        update: { itemId: row.itemId, equippedAt: new Date() },
        create: {
          userId: auth.userId,
          playerId: ['player_badge', 'avatar_frame'].includes(dto.cosmeticSlot) ? auth.playerId : null,
          cityId: dto.cityId,
          allianceId: dto.allianceId,
          cosmeticSlot: dto.cosmeticSlot,
          itemId: row.itemId,
        },
      });
      await tx.userInventoryItem.update({ where: { id: row.id }, data: { status: 'equipped' } });
      await this.recordTransaction(tx, auth.userId, auth.playerId, row.itemId, 'equip', 1, row.quantity, row.sourceType, row.sourceId, dto.cosmeticSlot, dto.cityId ?? dto.allianceId ?? auth.playerId, dto);
      await this.auditSensitive(tx, auth.userId, auth.playerId, 'inventory_item_equipped', 'inventory_item', row.id, dto);
    });
    return { success: true };
  }

  async unequipCosmetic(auth: AuthContext, dto: UnequipCosmeticDto) {
    await this.db().equippedCosmetic.deleteMany({
      where: {
        userId: auth.userId,
        cosmeticSlot: dto.cosmeticSlot,
        ...(dto.cityId ? { cityId: dto.cityId } : {}),
        ...(dto.allianceId ? { allianceId: dto.allianceId } : {}),
      },
    });
    await this.db().userInventoryItem.updateMany({
      where: { userId: auth.userId, itemId: { in: INVENTORY_ITEM_CATALOG.filter((item) => item.cosmeticSlot === dto.cosmeticSlot).map((item) => item.itemId) } },
      data: { status: 'available' },
    });
    return { success: true };
  }

  async listTransactions(auth: AuthContext, query: AdminInventoryQueryDto) {
    await this.assertAdmin(auth, 'operator');
    const where = {
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.playerId ? { playerId: query.playerId } : {}),
      ...(query.itemId ? { itemId: query.itemId } : {}),
      ...(query.sourceType ? { sourceType: query.sourceType } : {}),
      ...(query.transactionType ? { transactionType: query.transactionType } : {}),
    };
    const take = Number(query.pageSize ?? 50);
    const rows = await this.db().inventoryTransaction.findMany({
      where,
      include: { user: { select: { email: true, displayName: true } }, player: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take,
      skip: (Number(query.page ?? 1) - 1) * take,
    });
    return { transactions: rows.map((row: Db) => ({ ...this.serializable(row), definition: getInventoryItemDefinition(row.itemId) })) };
  }

  async adminGrant(auth: AuthContext, dto: AdminGrantInventoryDto) {
    await this.assertAdmin(auth, 'operator');
    if (!dto.reason?.trim()) {
      throw new ApiErrorException('Admin grant reason is required.', 'ADMIN_REASON_REQUIRED', HttpStatus.BAD_REQUEST);
    }
    const player = await this.db().player.findFirst({ where: { id: dto.playerId, worldId: auth.worldId } });
    if (!player) throw new ApiErrorException('Player not found.', 'PLAYER_NOT_FOUND', HttpStatus.NOT_FOUND);
    const idempotencyKey = dto.idempotencyKey ?? `admin:${auth.userId}:${dto.playerId}:${dto.itemId}:${dto.reason}`;
    await this.grantInventoryItem({
      userId: player.userId,
      playerId: player.id,
      itemId: dto.itemId,
      quantity: dto.quantity,
      sourceType: 'admin',
      sourceId: idempotencyKey,
      idempotencyKey,
      metadata: { reason: dto.reason, adminUserId: auth.userId },
    });
    await this.db().adminActionLog.create({
      data: {
        worldId: auth.worldId,
        adminUserId: auth.userId,
        actionType: 'admin_inventory_grant',
        targetType: 'player',
        targetId: player.id,
        playerId: player.id,
        reason: dto.reason,
        metadata: { itemId: dto.itemId, quantity: dto.quantity },
      },
    });
    return { success: true };
  }

  private async applyResourcePack(auth: AuthContext, row: InventoryRow, definition: any, quantity: number, cityId?: string) {
    const city = await this.requireOwnedCity(auth, cityId);
    const grants = definition.grants?.resources ?? {};
    await this.db().$transaction(async (tx: Db) => {
      const resources = await tx.cityResource.upsert({
        where: { cityId: city.id },
        update: {},
        create: { cityId: city.id },
      });
      const capacity = await this.storageCapacity(tx, city.id);
      const updates: Record<string, number> = {};
      const transactions = [];
      for (const key of RESOURCE_KEYS) {
        const amount = (grants[key] ?? 0) * quantity;
        if (amount <= 0) continue;
        const accepted = Math.max(0, Math.min(amount, capacity - (resources[key] ?? 0)));
        if (accepted <= 0) throw new ApiErrorException('The selected city does not have enough storage capacity.', 'NOT_ENOUGH_STORAGE_CAPACITY', HttpStatus.BAD_REQUEST);
        updates[key] = (resources[key] ?? 0) + accepted;
        transactions.push({ key, amount: accepted, balanceAfter: updates[key] });
      }
      await tx.cityResource.update({ where: { cityId: city.id }, data: updates });
      for (const entry of transactions) {
        await tx.resourceTransaction.create({
          data: { worldId: auth.worldId, cityId: city.id, playerId: auth.playerId, transactionType: 'inventory_resource_pack', resourceType: entry.key, amount: entry.amount, balanceAfter: entry.balanceAfter, referenceType: 'inventory_item', referenceId: row.id },
        });
      }
      await this.consumeRow(tx, auth, row, quantity, 'city', city.id, { grants: transactions });
    });
  }

  private async applyUnitPack(auth: AuthContext, row: InventoryRow, definition: any, quantity: number, cityId?: string) {
    const city = await this.requireOwnedCity(auth, cityId);
    const grants = definition.grants?.units ?? {};
    await this.db().$transaction(async (tx: Db) => {
      for (const [unitType, unitQuantity] of Object.entries(grants)) {
        const unitDefinition = UNIT_CONFIG[unitType as keyof typeof UNIT_CONFIG];
        if (unitDefinition?.requiredBuildingType) {
          const building = await tx.cityBuilding.findUnique({ where: { cityId_buildingType: { cityId: city.id, buildingType: unitDefinition.requiredBuildingType } } });
          if (!building || building.level < unitDefinition.requiredBuildingLevel) {
            throw new ApiErrorException('This item cannot be used here.', 'INVENTORY_ITEM_CANNOT_BE_USED', HttpStatus.BAD_REQUEST);
          }
        }
        await tx.cityUnit.upsert({
          where: { cityId_unitType: { cityId: city.id, unitType } },
          update: { quantity: { increment: Number(unitQuantity) * quantity } },
          create: { cityId: city.id, unitType, quantity: Number(unitQuantity) * quantity },
        });
      }
      await this.consumeRow(tx, auth, row, quantity, 'city', city.id, { grants });
    });
  }

  private async renameCity(auth: AuthContext, row: InventoryRow, quantity: number, cityId?: string, newName?: string) {
    const city = await this.requireOwnedCity(auth, cityId);
    const name = this.validName(newName);
    await this.db().$transaction(async (tx: Db) => {
      const duplicate = await tx.city.findFirst({ where: { playerId: auth.playerId, name, id: { not: city.id } } });
      if (duplicate) throw new ApiErrorException('City name is already in use.', 'CITY_NAME_TAKEN', HttpStatus.CONFLICT);
      await tx.city.update({ where: { id: city.id }, data: { name } });
      await this.consumeRow(tx, auth, row, quantity, 'city', city.id, { newName: name });
    });
    return { success: true };
  }

  private async renamePlayer(auth: AuthContext, row: InventoryRow, quantity: number, newName?: string) {
    const name = this.validName(newName);
    await this.db().$transaction(async (tx: Db) => {
      const duplicate = await tx.player.findFirst({ where: { worldId: auth.worldId, name, id: { not: auth.playerId } } });
      if (duplicate) throw new ApiErrorException('Player name is already in use.', 'PLAYER_NAME_TAKEN', HttpStatus.CONFLICT);
      await tx.player.update({ where: { id: auth.playerId }, data: { name } });
      await this.consumeRow(tx, auth, row, quantity, 'player', auth.playerId, { newName: name });
    });
  }

  private async consumeRow(tx: Db, auth: AuthContext, row: InventoryRow, quantity: number, targetType?: string, targetId?: string, metadata?: unknown) {
    const remaining = row.quantity - quantity;
    await tx.userInventoryItem.update({
      where: { id: row.id },
      data: { quantity: Math.max(remaining, 0), status: remaining > 0 ? 'available' : 'consumed', lastUsedAt: new Date() },
    });
    await this.recordTransaction(tx, auth.userId, auth.playerId, row.itemId, 'consume', quantity, Math.max(remaining, 0), row.sourceType, row.sourceId, targetType, targetId, metadata);
    await this.auditSensitive(tx, auth.userId, auth.playerId, 'inventory_item_consumed', 'inventory_item', row.id, { itemId: row.itemId, quantity, targetType, targetId });
  }

  private assertUsable(row: InventoryRow, definition: any, quantity: number) {
    if (row.status !== 'available') throw new ApiErrorException('This item cannot be used here.', 'INVENTORY_ITEM_CANNOT_BE_USED', HttpStatus.BAD_REQUEST);
    if (row.expiresAt && row.expiresAt < new Date()) throw new ApiErrorException('This item has expired.', 'INVENTORY_ITEM_EXPIRED', HttpStatus.BAD_REQUEST);
    if (definition.behavior !== 'consumable') throw new ApiErrorException('This item cannot be used here.', 'INVENTORY_ITEM_CANNOT_BE_USED', HttpStatus.BAD_REQUEST);
    if (quantity < 1 || row.quantity < quantity) throw new ApiErrorException('You do not own this item.', 'INVENTORY_ITEM_NOT_OWNED', HttpStatus.BAD_REQUEST);
  }

  private async findOwnedItem(auth: AuthContext, inventoryItemId: string) {
    const row = await this.db().userInventoryItem.findFirst({ where: { id: inventoryItemId, userId: auth.userId } });
    if (!row) throw new ApiErrorException('Inventory item not found.', 'INVENTORY_ITEM_NOT_FOUND', HttpStatus.NOT_FOUND);
    return row;
  }

  private requireDefinition(itemId: string) {
    const definition = getInventoryItemDefinition(itemId);
    if (!definition) throw new ApiErrorException('Inventory item not found.', 'INVENTORY_ITEM_NOT_FOUND', HttpStatus.NOT_FOUND);
    return definition;
  }

  private async requireOwnedCity(auth: AuthContext, cityId?: string) {
    if (!cityId) throw new ApiErrorException('Invalid item target.', 'INVALID_INVENTORY_TARGET', HttpStatus.BAD_REQUEST);
    const city = await this.db().city.findFirst({ where: { id: cityId, playerId: auth.playerId, worldId: auth.worldId } });
    if (!city) throw new ApiErrorException('Invalid item target.', 'INVALID_INVENTORY_TARGET', HttpStatus.BAD_REQUEST);
    return city;
  }

  private async validateCosmeticTarget(auth: AuthContext, cosmeticSlot: string, cityId?: string, allianceId?: string) {
    if (cosmeticSlot === 'city_skin') await this.requireOwnedCity(auth, cityId);
    if (cosmeticSlot === 'alliance_banner') {
      const member = await this.db().allianceMember.findFirst({ where: { playerId: auth.playerId, allianceId, role: { in: ['leader', 'officer'] } } });
      if (!member) throw new ApiErrorException('Invalid item target.', 'INVALID_INVENTORY_TARGET', HttpStatus.BAD_REQUEST);
    }
  }

  private async storageCapacity(tx: Db, cityId: string): Promise<number> {
    const warehouse = await tx.cityBuilding.findUnique({ where: { cityId_buildingType: { cityId, buildingType: 'warehouse' } } });
    return STORAGE_CONFIG.baseStorage + (warehouse?.level ?? 0) * STORAGE_CONFIG.storagePerWarehouseLevel;
  }

  private async recordTransaction(tx: Db, userId: string, playerId: string | undefined, itemId: string, transactionType: string, quantity: number, balanceAfter?: number, sourceType?: string, sourceId?: string, targetType?: string, targetId?: string, metadata?: unknown) {
    await tx.inventoryTransaction.create({ data: { userId, playerId, itemId, transactionType, quantity, balanceAfter, sourceType, sourceId, targetType, targetId, metadata: metadata as any } });
  }

  private async auditSensitive(tx: Db, userId: string, playerId: string | undefined, actionType: string, targetType: string, targetId: string, payload?: unknown) {
    await tx.sensitiveActionAuditLog.create({ data: { userId, playerId, actionType, targetType, targetId, payload: payload as any } }).catch(() => undefined);
  }

  private itemSummary(row: InventoryRow, equipped: InventoryRow[] = []) {
    const definition = this.requireDefinition(row.itemId);
    const equippedState = equipped.find((item) => item.itemId === row.itemId);
    return {
      inventoryItemId: row.id,
      itemId: row.itemId,
      name: definition.name,
      description: definition.description,
      category: definition.category,
      behavior: definition.behavior,
      quantity: row.quantity,
      status: row.status,
      expiresAt: row.expiresAt?.toISOString?.() ?? null,
      sourceType: row.sourceType,
      sourceId: row.sourceId,
      canUse: definition.behavior === 'consumable' && row.status === 'available',
      canEquip: definition.behavior === 'equippable',
      equipped: Boolean(equippedState),
      cosmeticSlot: definition.cosmeticSlot ?? null,
      targetType: definition.targetType ?? null,
    };
  }

  private validName(value?: string) {
    const name = value?.trim() ?? '';
    if (!/^[A-Za-z0-9][A-Za-z0-9 _-]{2,31}$/.test(name)) {
      throw new ApiErrorException('Invalid item target.', 'INVALID_INVENTORY_TARGET', HttpStatus.BAD_REQUEST);
    }
    return name;
  }

  private serializable(row: Db) {
    return JSON.parse(JSON.stringify(row));
  }

  private async assertAdmin(auth: AuthContext, minimumRole: 'viewer' | 'support' | 'operator' | 'moderator' | 'super_admin') {
    const levels = { viewer: 1, support: 2, moderator: 3, operator: 4, super_admin: 5 };
    const user = await this.db().user.findUnique({ where: { id: auth.userId } });
    if (!user?.isAdmin || levels[user.adminRole as keyof typeof levels] < levels[minimumRole]) {
      throw new ApiErrorException('Admin access required.', 'ADMIN_ACCESS_REQUIRED', HttpStatus.FORBIDDEN);
    }
  }

  private db(): Db {
    return this.prisma as unknown as Db;
  }
}
