CREATE TABLE "CitySpyState" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "cityId" TEXT NOT NULL,
  "spies" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CitySpyState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SpyTrainingJob" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "cityId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'training',
  "startedAt" TIMESTAMP(3) NOT NULL,
  "finishesAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SpyTrainingJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SpyMission" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "attackerPlayerId" TEXT NOT NULL,
  "originCityId" TEXT NOT NULL,
  "targetPlayerId" TEXT NOT NULL,
  "targetCityId" TEXT NOT NULL,
  "missionType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'in_transit',
  "movementId" TEXT,
  "returnMovementId" TEXT,
  "successChance" DOUBLE PRECISION NOT NULL,
  "detectionChance" DOUBLE PRECISION NOT NULL,
  "wasSuccessful" BOOLEAN,
  "wasDetected" BOOLEAN,
  "spyLost" BOOLEAN,
  "reportMessageId" TEXT,
  "cooldownKey" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SpyMission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SpyCooldown" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "attackerPlayerId" TEXT NOT NULL,
  "targetCityId" TEXT NOT NULL,
  "cooldownEndsAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SpyCooldown_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CitySpyState_cityId_key" ON "CitySpyState"("cityId");
CREATE INDEX "CitySpyState_worldId_idx" ON "CitySpyState"("worldId");
CREATE INDEX "CitySpyState_playerId_idx" ON "CitySpyState"("playerId");

CREATE INDEX "SpyTrainingJob_worldId_idx" ON "SpyTrainingJob"("worldId");
CREATE INDEX "SpyTrainingJob_playerId_idx" ON "SpyTrainingJob"("playerId");
CREATE INDEX "SpyTrainingJob_cityId_idx" ON "SpyTrainingJob"("cityId");
CREATE INDEX "SpyTrainingJob_status_idx" ON "SpyTrainingJob"("status");
CREATE INDEX "SpyTrainingJob_finishesAt_idx" ON "SpyTrainingJob"("finishesAt");

CREATE INDEX "SpyMission_worldId_idx" ON "SpyMission"("worldId");
CREATE INDEX "SpyMission_attackerPlayerId_idx" ON "SpyMission"("attackerPlayerId");
CREATE INDEX "SpyMission_targetPlayerId_idx" ON "SpyMission"("targetPlayerId");
CREATE INDEX "SpyMission_originCityId_idx" ON "SpyMission"("originCityId");
CREATE INDEX "SpyMission_targetCityId_idx" ON "SpyMission"("targetCityId");
CREATE INDEX "SpyMission_missionType_idx" ON "SpyMission"("missionType");
CREATE INDEX "SpyMission_status_idx" ON "SpyMission"("status");
CREATE INDEX "SpyMission_cooldownKey_idx" ON "SpyMission"("cooldownKey");
CREATE INDEX "SpyMission_startedAt_idx" ON "SpyMission"("startedAt");

CREATE UNIQUE INDEX "SpyCooldown_attackerPlayerId_targetCityId_key" ON "SpyCooldown"("attackerPlayerId", "targetCityId");
CREATE INDEX "SpyCooldown_worldId_idx" ON "SpyCooldown"("worldId");
CREATE INDEX "SpyCooldown_cooldownEndsAt_idx" ON "SpyCooldown"("cooldownEndsAt");

ALTER TABLE "CitySpyState" ADD CONSTRAINT "CitySpyState_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CitySpyState" ADD CONSTRAINT "CitySpyState_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CitySpyState" ADD CONSTRAINT "CitySpyState_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SpyTrainingJob" ADD CONSTRAINT "SpyTrainingJob_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SpyTrainingJob" ADD CONSTRAINT "SpyTrainingJob_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SpyTrainingJob" ADD CONSTRAINT "SpyTrainingJob_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SpyMission" ADD CONSTRAINT "SpyMission_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SpyMission" ADD CONSTRAINT "SpyMission_attackerPlayerId_fkey" FOREIGN KEY ("attackerPlayerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SpyMission" ADD CONSTRAINT "SpyMission_targetPlayerId_fkey" FOREIGN KEY ("targetPlayerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SpyMission" ADD CONSTRAINT "SpyMission_originCityId_fkey" FOREIGN KEY ("originCityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SpyMission" ADD CONSTRAINT "SpyMission_targetCityId_fkey" FOREIGN KEY ("targetCityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SpyCooldown" ADD CONSTRAINT "SpyCooldown_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SpyCooldown" ADD CONSTRAINT "SpyCooldown_attackerPlayerId_fkey" FOREIGN KEY ("attackerPlayerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "CitySpyState" ("id", "worldId", "playerId", "cityId", "spies", "updatedAt")
SELECT 'spy-state-' || "id", "worldId", "playerId", "id", 0, CURRENT_TIMESTAMP
FROM "City"
ON CONFLICT ("cityId") DO NOTHING;

INSERT INTO "CityBuilding" ("id", "cityId", "buildingType", "level", "slotIndex", "status", "createdAt", "updatedAt")
SELECT 'building-spy-agency-' || "id", "id", 'spy_agency', 0, 16, 'idle', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "City"
ON CONFLICT ("cityId", "buildingType") DO NOTHING;
