"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STORAGE_CONFIG = exports.RESOURCE_PRODUCTION_CONFIG = exports.RESOURCE_LABELS = exports.RESOURCE_TYPES = void 0;
exports.RESOURCE_TYPES = {
    WOOD: 'wood',
    GOLD: 'gold',
    MARBLE: 'marble',
    WINE: 'wine',
    CRYSTAL: 'crystal',
    SULFUR: 'sulfur',
};
exports.RESOURCE_LABELS = {
    [exports.RESOURCE_TYPES.WOOD]: 'Wood',
    [exports.RESOURCE_TYPES.GOLD]: 'Gold',
    [exports.RESOURCE_TYPES.MARBLE]: 'Marble',
    [exports.RESOURCE_TYPES.WINE]: 'Wine',
    [exports.RESOURCE_TYPES.CRYSTAL]: 'Crystal',
    [exports.RESOURCE_TYPES.SULFUR]: 'Sulfur',
};
exports.RESOURCE_PRODUCTION_CONFIG = {
    baseWoodPerHour: 30,
    baseGoldPerHour: 20,
    woodPerWorkerPerHour: 5,
    goldPerWorkerPerHour: 3,
};
exports.STORAGE_CONFIG = {
    baseStorage: 1000,
    storagePerWarehouseLevel: 2000,
};
