-- Sprint 10: PvE camps, basic units, barracks training, and army movements.

CREATE TABLE "PveCamp" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "enemyStrength" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PveCamp_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CityUnit" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "unitType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CityUnit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UnitTrainingOrder" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "unitType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishesAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnitTrainingOrder_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Movement" ADD COLUMN "destinationCampId" TEXT;

CREATE UNIQUE INDEX "PveCamp_worldId_x_y_key" ON "PveCamp"("worldId", "x", "y");
CREATE INDEX "PveCamp_worldId_idx" ON "PveCamp"("worldId");
CREATE INDEX "PveCamp_level_idx" ON "PveCamp"("level");

CREATE UNIQUE INDEX "CityUnit_cityId_unitType_key" ON "CityUnit"("cityId", "unitType");
CREATE INDEX "CityUnit_cityId_idx" ON "CityUnit"("cityId");

CREATE INDEX "UnitTrainingOrder_worldId_idx" ON "UnitTrainingOrder"("worldId");
CREATE INDEX "UnitTrainingOrder_playerId_idx" ON "UnitTrainingOrder"("playerId");
CREATE INDEX "UnitTrainingOrder_cityId_idx" ON "UnitTrainingOrder"("cityId");
CREATE INDEX "UnitTrainingOrder_status_idx" ON "UnitTrainingOrder"("status");
CREATE INDEX "UnitTrainingOrder_finishesAt_idx" ON "UnitTrainingOrder"("finishesAt");

CREATE INDEX "Movement_destinationCampId_idx" ON "Movement"("destinationCampId");

ALTER TABLE "PveCamp" ADD CONSTRAINT "PveCamp_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CityUnit" ADD CONSTRAINT "CityUnit_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UnitTrainingOrder" ADD CONSTRAINT "UnitTrainingOrder_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UnitTrainingOrder" ADD CONSTRAINT "UnitTrainingOrder_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UnitTrainingOrder" ADD CONSTRAINT "UnitTrainingOrder_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_destinationCampId_fkey" FOREIGN KEY ("destinationCampId") REFERENCES "PveCamp"("id") ON DELETE SET NULL ON UPDATE CASCADE;
