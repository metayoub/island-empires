CREATE TABLE "PlayerQuestProgress" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "questId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'locked',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "target" INTEGER NOT NULL DEFAULT 1,
  "completedAt" TIMESTAMP(3),
  "claimedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PlayerQuestProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlayerQuestProgress_playerId_questId_key" ON "PlayerQuestProgress"("playerId", "questId");
CREATE INDEX "PlayerQuestProgress_worldId_idx" ON "PlayerQuestProgress"("worldId");
CREATE INDEX "PlayerQuestProgress_playerId_idx" ON "PlayerQuestProgress"("playerId");
CREATE INDEX "PlayerQuestProgress_status_idx" ON "PlayerQuestProgress"("status");

ALTER TABLE "PlayerQuestProgress"
ADD CONSTRAINT "PlayerQuestProgress_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "PlayerQuestProgress_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PlayerOnboardingState" (
  "playerId" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "hasCompletedTutorial" BOOLEAN NOT NULL DEFAULT false,
  "currentQuestId" TEXT,
  "guideDismissed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PlayerOnboardingState_pkey" PRIMARY KEY ("playerId")
);

CREATE INDEX "PlayerOnboardingState_worldId_idx" ON "PlayerOnboardingState"("worldId");

ALTER TABLE "PlayerOnboardingState"
ADD CONSTRAINT "PlayerOnboardingState_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "PlayerOnboardingState_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
