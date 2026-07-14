import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthContext } from '../auth/auth-context.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentAuth } from '../auth/current-auth.decorator';
import {
  AdminGrantInventoryDto,
  AdminInventoryQueryDto,
  EquipInventoryItemDto,
  InventoryQueryDto,
  UnequipCosmeticDto,
  UseInventoryItemDto,
} from './dto/inventory.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
@UseGuards(AuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  getInventory(@CurrentAuth() auth: AuthContext, @Query() query: InventoryQueryDto) {
    return this.inventoryService.getInventory(auth, query);
  }

  @Get(':inventoryItemId')
  getInventoryItem(@CurrentAuth() auth: AuthContext, @Param('inventoryItemId') inventoryItemId: string) {
    return this.inventoryService.getInventoryItem(auth, inventoryItemId);
  }

  @Post(':inventoryItemId/use')
  useItem(
    @CurrentAuth() auth: AuthContext,
    @Param('inventoryItemId') inventoryItemId: string,
    @Body() dto: UseInventoryItemDto,
  ) {
    return this.inventoryService.useInventoryItem(auth, inventoryItemId, dto);
  }

  @Post(':inventoryItemId/equip')
  equipItem(
    @CurrentAuth() auth: AuthContext,
    @Param('inventoryItemId') inventoryItemId: string,
    @Body() dto: EquipInventoryItemDto,
  ) {
    return this.inventoryService.equipInventoryCosmetic(auth, inventoryItemId, dto);
  }

  @Post('cosmetics/unequip')
  unequip(@CurrentAuth() auth: AuthContext, @Body() dto: UnequipCosmeticDto) {
    return this.inventoryService.unequipCosmetic(auth, dto);
  }
}

@Controller('admin/inventory')
@UseGuards(AuthGuard)
export class AdminInventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('transactions')
  transactions(@CurrentAuth() auth: AuthContext, @Query() query: AdminInventoryQueryDto) {
    return this.inventoryService.listTransactions(auth, query);
  }

  @Post('grant')
  grant(@CurrentAuth() auth: AuthContext, @Body() dto: AdminGrantInventoryDto) {
    return this.inventoryService.adminGrant(auth, dto);
  }
}
