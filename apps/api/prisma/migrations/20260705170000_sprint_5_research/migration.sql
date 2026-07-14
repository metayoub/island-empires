ALTER TABLE "CityWorkerAssignment"
ADD COLUMN "scientists" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "PlayerResearchState" (
  "playerId" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "researchPoints" INTEGER NOT NULL DEFAULT 0,
  "researchLastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlayerResearchState_pkey" PRIMARY KEY ("playerId")
);

CREATE INDEX "PlayerResearchState_worldId_idx" ON "PlayerResearchState"("worldId");

ALTER TABLE "PlayerResearchState"
ADD CONSTRAINT "PlayerResearchState_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "PlayerResearchState_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PlayerTechnology" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "technologyId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'completed',
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlayerTechnology_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlayerTechnology_playerId_technologyId_key" ON "PlayerTechnology"("playerId", "technologyId");
CREATE INDEX "PlayerTechnology_worldId_idx" ON "PlayerTechnology"("worldId");
CREATE INDEX "PlayerTechnology_playerId_idx" ON "PlayerTechnology"("playerId");
CREATE INDEX "PlayerTechnology_technologyId_idx" ON "PlayerTechnology"("technologyId");

ALTER TABLE "PlayerTechnology"
ADD CONSTRAINT "PlayerTechnology_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "PlayerTechnology_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ResearchJob" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "technologyId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "startedAt" TIMESTAMP(3) NOT NULL,
  "finishesAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ResearchJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ResearchJob_worldId_idx" ON "ResearchJob"("worldId");
CREATE INDEX "ResearchJob_playerId_idx" ON "ResearchJob"("playerId");
CREATE INDEX "ResearchJob_technologyId_idx" ON "ResearchJob"("technologyId");
CREATE INDEX "ResearchJob_status_idx" ON "ResearchJob"("status");
CREATE INDEX "ResearchJob_finishesAt_idx" ON "ResearchJob"("finishesAt");

ALTER TABLE "ResearchJob"
ADD CONSTRAINT "ResearchJob_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "ResearchJob_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ResearchPointTransaction" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "transactionType" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ResearchPointTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ResearchPointTransaction_worldId_idx" ON "ResearchPointTransaction"("worldId");
CREATE INDEX "ResearchPointTransaction_playerId_idx" ON "ResearchPointTransaction"("playerId");
CREATE INDEX "ResearchPointTransaction_transactionType_idx" ON "ResearchPointTransaction"("transactionType");

ALTER TABLE "ResearchPointTransaction"
ADD CONSTRAINT "ResearchPointTransaction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "ResearchPointTransaction_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "PlayerResearchState" ("playerId", "worldId", "researchPoints", "researchLastCalculatedAt")
SELECT p."id", p."worldId", 0, CURRENT_TIMESTAMP
FROM "Player" p
WHERE NOT EXISTS (
  SELECT 1
  FROM "PlayerResearchState" s
  WHERE s."playerId" = p."id"
);
