-- Sprint 10 fix: barbarian camps live on islands, not in open water.
-- Existing camps are development data and regenerate lazily anchored to islands.

UPDATE "Movement"
SET "status" = 'cancelled', "completedAt" = now()
WHERE "movementType" IN ('pve_attack', 'pve_return')
  AND "status" IN ('in_transit', 'returning');

DELETE FROM "PveCamp";

DROP INDEX "PveCamp_worldId_x_y_key";

ALTER TABLE "PveCamp" DROP COLUMN "x";
ALTER TABLE "PveCamp" DROP COLUMN "y";
ALTER TABLE "PveCamp" ADD COLUMN "islandId" TEXT NOT NULL;

CREATE UNIQUE INDEX "PveCamp_islandId_key" ON "PveCamp"("islandId");

ALTER TABLE "PveCamp" ADD CONSTRAINT "PveCamp_islandId_fkey" FOREIGN KEY ("islandId") REFERENCES "Island"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
