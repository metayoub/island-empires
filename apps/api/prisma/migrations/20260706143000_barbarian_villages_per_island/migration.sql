ALTER TABLE "PveCamp" ADD COLUMN IF NOT EXISTS "slotIndex" INTEGER NOT NULL DEFAULT 7;

UPDATE "PveCamp"
SET "name" = REPLACE(
    REPLACE(
      REPLACE("name", 'Barbarian Stronghold', 'Barbarian Village'),
      'Barbarian Outpost',
      'Barbarian Village'
    ),
    'Barbarian Camp',
    'Barbarian Village'
  )
WHERE "name" LIKE '%Barbarian Stronghold%'
   OR "name" LIKE '%Barbarian Outpost%'
   OR "name" LIKE '%Barbarian Camp%';

CREATE TABLE IF NOT EXISTS "PlayerPveCampProgress" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "pveCampId" TEXT NOT NULL,
    "victoryCount" INTEGER NOT NULL DEFAULT 0,
    "lastVictoryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerPveCampProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlayerPveCampProgress_playerId_pveCampId_key" ON "PlayerPveCampProgress"("playerId", "pveCampId");
CREATE INDEX IF NOT EXISTS "PlayerPveCampProgress_worldId_idx" ON "PlayerPveCampProgress"("worldId");
CREATE INDEX IF NOT EXISTS "PlayerPveCampProgress_playerId_idx" ON "PlayerPveCampProgress"("playerId");
CREATE INDEX IF NOT EXISTS "PlayerPveCampProgress_pveCampId_idx" ON "PlayerPveCampProgress"("pveCampId");

ALTER TABLE "PlayerPveCampProgress"
  ADD CONSTRAINT "PlayerPveCampProgress_worldId_fkey"
  FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlayerPveCampProgress"
  ADD CONSTRAINT "PlayerPveCampProgress_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlayerPveCampProgress"
  ADD CONSTRAINT "PlayerPveCampProgress_pveCampId_fkey"
  FOREIGN KEY ("pveCampId") REFERENCES "PveCamp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
