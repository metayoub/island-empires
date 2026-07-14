CREATE TABLE "CityFleet" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "cityId" TEXT NOT NULL,
  "lightShip" INTEGER NOT NULL DEFAULT 0,
  "ramShip" INTEGER NOT NULL DEFAULT 0,
  "fireShip" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CityFleet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NavalTrainingJob" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "cityId" TEXT NOT NULL,
  "shipType" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'training',
  "startedAt" TIMESTAMP(3) NOT NULL,
  "finishesAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NavalTrainingJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NavalAttack" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "attackerPlayerId" TEXT NOT NULL,
  "defenderPlayerId" TEXT NOT NULL,
  "originCityId" TEXT NOT NULL,
  "targetCityId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'in_transit',
  "attackMovementId" TEXT,
  "returnMovementId" TEXT,
  "sentLightShip" INTEGER NOT NULL DEFAULT 0,
  "sentRamShip" INTEGER NOT NULL DEFAULT 0,
  "sentFireShip" INTEGER NOT NULL DEFAULT 0,
  "lostLightShip" INTEGER NOT NULL DEFAULT 0,
  "lostRamShip" INTEGER NOT NULL DEFAULT 0,
  "lostFireShip" INTEGER NOT NULL DEFAULT 0,
  "returnedLightShip" INTEGER NOT NULL DEFAULT 0,
  "returnedRamShip" INTEGER NOT NULL DEFAULT 0,
  "returnedFireShip" INTEGER NOT NULL DEFAULT 0,
  "result" TEXT,
  "attackerPower" INTEGER,
  "defenderPower" INTEGER,
  "blockadeCreated" BOOLEAN NOT NULL DEFAULT false,
  "blockadeId" TEXT,
  "attackerReportMessageId" TEXT,
  "defenderReportMessageId" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NavalAttack_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CityBlockade" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "attackerPlayerId" TEXT NOT NULL,
  "defenderPlayerId" TEXT NOT NULL,
  "originCityId" TEXT NOT NULL,
  "targetCityId" TEXT NOT NULL,
  "navalAttackId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "startedAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3),
  "committedLightShip" INTEGER NOT NULL DEFAULT 0,
  "committedRamShip" INTEGER NOT NULL DEFAULT 0,
  "committedFireShip" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CityBlockade_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NavalCooldown" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "attackerPlayerId" TEXT NOT NULL,
  "targetCityId" TEXT NOT NULL,
  "cooldownEndsAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NavalCooldown_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CityFleet_cityId_key" ON "CityFleet"("cityId");
CREATE INDEX "CityFleet_worldId_idx" ON "CityFleet"("worldId");
CREATE INDEX "CityFleet_playerId_idx" ON "CityFleet"("playerId");
CREATE INDEX "NavalTrainingJob_worldId_idx" ON "NavalTrainingJob"("worldId");
CREATE INDEX "NavalTrainingJob_playerId_idx" ON "NavalTrainingJob"("playerId");
CREATE INDEX "NavalTrainingJob_cityId_idx" ON "NavalTrainingJob"("cityId");
CREATE INDEX "NavalTrainingJob_shipType_idx" ON "NavalTrainingJob"("shipType");
CREATE INDEX "NavalTrainingJob_status_idx" ON "NavalTrainingJob"("status");
CREATE INDEX "NavalTrainingJob_finishesAt_idx" ON "NavalTrainingJob"("finishesAt");
CREATE INDEX "NavalAttack_worldId_idx" ON "NavalAttack"("worldId");
CREATE INDEX "NavalAttack_attackerPlayerId_idx" ON "NavalAttack"("attackerPlayerId");
CREATE INDEX "NavalAttack_defenderPlayerId_idx" ON "NavalAttack"("defenderPlayerId");
CREATE INDEX "NavalAttack_originCityId_idx" ON "NavalAttack"("originCityId");
CREATE INDEX "NavalAttack_targetCityId_idx" ON "NavalAttack"("targetCityId");
CREATE INDEX "NavalAttack_status_idx" ON "NavalAttack"("status");
CREATE INDEX "NavalAttack_startedAt_idx" ON "NavalAttack"("startedAt");
CREATE INDEX "CityBlockade_worldId_idx" ON "CityBlockade"("worldId");
CREATE INDEX "CityBlockade_attackerPlayerId_idx" ON "CityBlockade"("attackerPlayerId");
CREATE INDEX "CityBlockade_defenderPlayerId_idx" ON "CityBlockade"("defenderPlayerId");
CREATE INDEX "CityBlockade_targetCityId_idx" ON "CityBlockade"("targetCityId");
CREATE INDEX "CityBlockade_status_idx" ON "CityBlockade"("status");
CREATE INDEX "CityBlockade_endsAt_idx" ON "CityBlockade"("endsAt");
CREATE UNIQUE INDEX "NavalCooldown_attackerPlayerId_targetCityId_key" ON "NavalCooldown"("attackerPlayerId", "targetCityId");
CREATE INDEX "NavalCooldown_worldId_idx" ON "NavalCooldown"("worldId");
CREATE INDEX "NavalCooldown_cooldownEndsAt_idx" ON "NavalCooldown"("cooldownEndsAt");

ALTER TABLE "CityFleet" ADD CONSTRAINT "CityFleet_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CityFleet" ADD CONSTRAINT "CityFleet_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CityFleet" ADD CONSTRAINT "CityFleet_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NavalTrainingJob" ADD CONSTRAINT "NavalTrainingJob_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NavalTrainingJob" ADD CONSTRAINT "NavalTrainingJob_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NavalTrainingJob" ADD CONSTRAINT "NavalTrainingJob_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NavalAttack" ADD CONSTRAINT "NavalAttack_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CityBlockade" ADD CONSTRAINT "CityBlockade_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NavalCooldown" ADD CONSTRAINT "NavalCooldown_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "CityFleet" ("id", "worldId", "playerId", "cityId", "lightShip", "ramShip", "fireShip", "updatedAt")
SELECT
  c."id",
  c."worldId",
  c."playerId",
  c."id",
  COALESCE(MAX(CASE WHEN cu."unitType" IN ('light_ship', 'light_galley') THEN cu."quantity" END), 0),
  COALESCE(MAX(CASE WHEN cu."unitType" IN ('ram_ship', 'war_galley') THEN cu."quantity" END), 0),
  COALESCE(MAX(CASE WHEN cu."unitType" = 'fire_ship' THEN cu."quantity" END), 0),
  CURRENT_TIMESTAMP
FROM "City" c
LEFT JOIN "CityUnit" cu ON cu."cityId" = c."id"
GROUP BY c."id", c."worldId", c."playerId"
ON CONFLICT ("cityId") DO NOTHING;
