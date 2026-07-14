"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUILDING_UPGRADE_CONFIG = exports.BUILDING_CONFIG = exports.BUILDING_DISPLAY_CONFIG = exports.BUILDING_TYPES = void 0;
exports.BUILDING_TYPES = {
    CITY_HALL: 'city_hall',
    WAREHOUSE: 'warehouse',
    ACADEMY: 'academy',
    BARRACKS: 'barracks',
    PORT: 'port',
    TAVERN: 'tavern',
    PALACE: 'palace',
};
exports.BUILDING_DISPLAY_CONFIG = {
    [exports.BUILDING_TYPES.CITY_HALL]: {
        name: 'City Hall',
        description: 'The administrative center of your city.',
        enabledInSprint3: true,
    },
    [exports.BUILDING_TYPES.WAREHOUSE]: {
        name: 'Warehouse',
        description: 'Stores and protects your city resources.',
        enabledInSprint3: true,
    },
    [exports.BUILDING_TYPES.ACADEMY]: {
        name: 'Academy',
        description: 'Allows your city to generate research points.',
        enabledInSprint3: true,
    },
    [exports.BUILDING_TYPES.BARRACKS]: {
        name: 'Barracks',
        description: 'Trains land units for defense and combat.',
        enabledInSprint3: false,
    },
    [exports.BUILDING_TYPES.PORT]: {
        name: 'Port',
        description: 'Allows your city to send resources to your other cities.',
        enabledInSprint3: true,
    },
    [exports.BUILDING_TYPES.TAVERN]: {
        name: 'Tavern',
        description: 'Increases happiness and supports population growth.',
        enabledInSprint3: true,
    },
    [exports.BUILDING_TYPES.PALACE]: {
        name: 'Palace',
        description: 'Allows your empire to found additional cities.',
        enabledInSprint3: true,
    },
};
exports.BUILDING_CONFIG = exports.BUILDING_DISPLAY_CONFIG;
exports.BUILDING_UPGRADE_CONFIG = {
    [exports.BUILDING_TYPES.CITY_HALL]: {
        maxLevel: 5,
        baseCost: {
            wood: 120,
            gold: 50,
            marble: 0,
            wine: 0,
            crystal: 0,
            sulfur: 0,
        },
        costMultiplier: 1.6,
        baseDurationSeconds: 60,
        durationMultiplier: 1.5,
    },
    [exports.BUILDING_TYPES.WAREHOUSE]: {
        maxLevel: 5,
        baseCost: {
            wood: 100,
            gold: 40,
            marble: 0,
            wine: 0,
            crystal: 0,
            sulfur: 0,
        },
        costMultiplier: 1.5,
        baseDurationSeconds: 45,
        durationMultiplier: 1.4,
    },
    [exports.BUILDING_TYPES.PORT]: {
        maxLevel: 5,
        baseCost: {
            wood: 180,
            gold: 100,
            marble: 0,
            wine: 0,
            crystal: 0,
            sulfur: 0,
        },
        costMultiplier: 1.6,
        baseDurationSeconds: 120,
        durationMultiplier: 1.5,
    },
    [exports.BUILDING_TYPES.ACADEMY]: {
        maxLevel: 3,
        baseCost: {
            wood: 150,
            gold: 80,
            marble: 0,
            wine: 0,
            crystal: 0,
            sulfur: 0,
        },
        costMultiplier: 1.7,
        baseDurationSeconds: 90,
        durationMultiplier: 1.5,
    },
    [exports.BUILDING_TYPES.TAVERN]: {
        maxLevel: 3,
        baseCost: {
            wood: 120,
            gold: 60,
            marble: 0,
            wine: 0,
            crystal: 0,
            sulfur: 0,
        },
        costMultiplier: 1.5,
        baseDurationSeconds: 75,
        durationMultiplier: 1.4,
    },
    [exports.BUILDING_TYPES.PALACE]: {
        maxLevel: 3,
        baseCost: {
            wood: 300,
            gold: 200,
            marble: 0,
            wine: 0,
            crystal: 0,
            sulfur: 0,
        },
        costMultiplier: 2,
        baseDurationSeconds: 180,
        durationMultiplier: 1.8,
    },
};
