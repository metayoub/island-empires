CREATE TABLE "LiveEvent" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "announcement" TEXT,
  "bonusPercent" INTEGER,
  "reward" JSONB,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),

  CONSTRAINT "LiveEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LiveEventParticipation" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "points" INTEGER NOT NULL DEFAULT 0,
  "rewardClaimedAt" TIMESTAMP(3),
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LiveEventParticipation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LiveEvent_worldId_idx" ON "LiveEvent"("worldId");
CREATE INDEX "LiveEvent_type_idx" ON "LiveEvent"("type");
CREATE INDEX "LiveEvent_status_idx" ON "LiveEvent"("status");
CREATE INDEX "LiveEvent_startsAt_idx" ON "LiveEvent"("startsAt");
CREATE INDEX "LiveEvent_endsAt_idx" ON "LiveEvent"("endsAt");

CREATE UNIQUE INDEX "LiveEventParticipation_eventId_playerId_key" ON "LiveEventParticipation"("eventId", "playerId");
CREATE INDEX "LiveEventParticipation_worldId_idx" ON "LiveEventParticipation"("worldId");
CREATE INDEX "LiveEventParticipation_eventId_idx" ON "LiveEventParticipation"("eventId");
CREATE INDEX "LiveEventParticipation_playerId_idx" ON "LiveEventParticipation"("playerId");
CREATE INDEX "LiveEventParticipation_points_idx" ON "LiveEventParticipation"("points");

ALTER TABLE "LiveEvent"
  ADD CONSTRAINT "LiveEvent_worldId_fkey"
  FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LiveEventParticipation"
  ADD CONSTRAINT "LiveEventParticipation_worldId_fkey"
  FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LiveEventParticipation"
  ADD CONSTRAINT "LiveEventParticipation_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "LiveEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LiveEventParticipation"
  ADD CONSTRAINT "LiveEventParticipation_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
