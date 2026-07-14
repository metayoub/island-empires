CREATE TABLE "Movement" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "originCityId" TEXT NOT NULL,
    "destinationCityId" TEXT,
    "destinationIslandId" TEXT,
    "destinationSlotIndex" INTEGER,
    "movementType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "departureTime" TIMESTAMP(3) NOT NULL,
    "arrivalTime" TIMESTAMP(3) NOT NULL,
    "returnArrivalTime" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Movement_worldId_idx" ON "Movement"("worldId");
CREATE INDEX "Movement_playerId_idx" ON "Movement"("playerId");
CREATE INDEX "Movement_originCityId_idx" ON "Movement"("originCityId");
CREATE INDEX "Movement_destinationCityId_idx" ON "Movement"("destinationCityId");
CREATE INDEX "Movement_destinationIslandId_idx" ON "Movement"("destinationIslandId");
CREATE INDEX "Movement_movementType_idx" ON "Movement"("movementType");
CREATE INDEX "Movement_status_idx" ON "Movement"("status");
CREATE INDEX "Movement_arrivalTime_idx" ON "Movement"("arrivalTime");
CREATE INDEX "Movement_returnArrivalTime_idx" ON "Movement"("returnArrivalTime");

ALTER TABLE "Movement" ADD CONSTRAINT "Movement_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_originCityId_fkey" FOREIGN KEY ("originCityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_destinationCityId_fkey" FOREIGN KEY ("destinationCityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;
