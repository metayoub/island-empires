-- Sprint 11: lightweight local analytics for economy balancing.
CREATE TABLE "GameAnalyticsEvent" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GameAnalyticsEvent_worldId_idx" ON "GameAnalyticsEvent"("worldId");
CREATE INDEX "GameAnalyticsEvent_playerId_idx" ON "GameAnalyticsEvent"("playerId");
CREATE INDEX "GameAnalyticsEvent_eventType_idx" ON "GameAnalyticsEvent"("eventType");
CREATE INDEX "GameAnalyticsEvent_createdAt_idx" ON "GameAnalyticsEvent"("createdAt");

ALTER TABLE "GameAnalyticsEvent"
ADD CONSTRAINT "GameAnalyticsEvent_worldId_fkey"
FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GameAnalyticsEvent"
ADD CONSTRAINT "GameAnalyticsEvent_playerId_fkey"
FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
