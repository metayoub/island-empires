CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "cityId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "payload" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Report_worldId_idx" ON "Report"("worldId");
CREATE INDEX "Report_playerId_idx" ON "Report"("playerId");
CREATE INDEX "Report_cityId_idx" ON "Report"("cityId");
CREATE INDEX "Report_type_idx" ON "Report"("type");
CREATE INDEX "Report_isRead_idx" ON "Report"("isRead");

ALTER TABLE "Report" ADD CONSTRAINT "Report_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;
