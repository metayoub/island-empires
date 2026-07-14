-- Sprint 7: persistent world map islands and city placement.

CREATE TABLE "Island" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "name" TEXT,
    "mainResource" TEXT NOT NULL,
    "luxuryResource" TEXT NOT NULL,
    "maxSlots" INTEGER NOT NULL DEFAULT 8,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Island_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "City" ADD COLUMN "islandId" TEXT;
ALTER TABLE "City" ADD COLUMN "slotIndex" INTEGER;

CREATE UNIQUE INDEX "Island_worldId_x_y_key" ON "Island"("worldId", "x", "y");
CREATE INDEX "Island_worldId_idx" ON "Island"("worldId");
CREATE INDEX "Island_x_y_idx" ON "Island"("x", "y");
CREATE INDEX "City_islandId_idx" ON "City"("islandId");
CREATE UNIQUE INDEX "City_islandId_slotIndex_key" ON "City"("islandId", "slotIndex");

ALTER TABLE "Island" ADD CONSTRAINT "Island_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "City" ADD CONSTRAINT "City_islandId_fkey" FOREIGN KEY ("islandId") REFERENCES "Island"("id") ON DELETE SET NULL ON UPDATE CASCADE;
