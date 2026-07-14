ALTER TABLE "AllianceMember" ADD COLUMN "contributionScore" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "AllianceTreasury" (
  "allianceId" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "wood" INTEGER NOT NULL DEFAULT 0,
  "gold" INTEGER NOT NULL DEFAULT 0,
  "marble" INTEGER NOT NULL DEFAULT 0,
  "wine" INTEGER NOT NULL DEFAULT 0,
  "crystal" INTEGER NOT NULL DEFAULT 0,
  "sulfur" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AllianceTreasury_pkey" PRIMARY KEY ("allianceId")
);

CREATE TABLE "AllianceDonation" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "allianceId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "cityId" TEXT NOT NULL,
  "projectId" TEXT,
  "wood" INTEGER NOT NULL DEFAULT 0,
  "gold" INTEGER NOT NULL DEFAULT 0,
  "marble" INTEGER NOT NULL DEFAULT 0,
  "wine" INTEGER NOT NULL DEFAULT 0,
  "crystal" INTEGER NOT NULL DEFAULT 0,
  "sulfur" INTEGER NOT NULL DEFAULT 0,
  "contributionScore" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AllianceDonation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AllianceProject" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "allianceId" TEXT NOT NULL,
  "projectType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "woodRequired" INTEGER NOT NULL DEFAULT 0,
  "goldRequired" INTEGER NOT NULL DEFAULT 0,
  "marbleRequired" INTEGER NOT NULL DEFAULT 0,
  "wineRequired" INTEGER NOT NULL DEFAULT 0,
  "crystalRequired" INTEGER NOT NULL DEFAULT 0,
  "sulfurRequired" INTEGER NOT NULL DEFAULT 0,
  "woodContributed" INTEGER NOT NULL DEFAULT 0,
  "goldContributed" INTEGER NOT NULL DEFAULT 0,
  "marbleContributed" INTEGER NOT NULL DEFAULT 0,
  "wineContributed" INTEGER NOT NULL DEFAULT 0,
  "crystalContributed" INTEGER NOT NULL DEFAULT 0,
  "sulfurContributed" INTEGER NOT NULL DEFAULT 0,
  "startedById" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AllianceProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AllianceProjectContribution" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "allianceId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "donationId" TEXT,
  "wood" INTEGER NOT NULL DEFAULT 0,
  "gold" INTEGER NOT NULL DEFAULT 0,
  "marble" INTEGER NOT NULL DEFAULT 0,
  "wine" INTEGER NOT NULL DEFAULT 0,
  "crystal" INTEGER NOT NULL DEFAULT 0,
  "sulfur" INTEGER NOT NULL DEFAULT 0,
  "contributionScore" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AllianceProjectContribution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AllianceBonus" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "allianceId" TEXT NOT NULL,
  "projectId" TEXT,
  "bonusType" TEXT NOT NULL,
  "value" INTEGER NOT NULL,
  "unlockedById" TEXT,
  "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AllianceBonus_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AllianceHelpRequest" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "allianceId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "cityId" TEXT,
  "kind" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AllianceHelpRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AllianceTradeRequest" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "allianceId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "offeredResource" TEXT NOT NULL,
  "offeredAmount" INTEGER NOT NULL,
  "requestedResource" TEXT NOT NULL,
  "requestedAmount" INTEGER NOT NULL,
  "message" TEXT,
  "status" TEXT NOT NULL DEFAULT 'open',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AllianceTradeRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AllianceSharedBattleReport" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "allianceId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "message" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AllianceSharedBattleReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AllianceActivityEntry" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "allianceId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AllianceActivityEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AllianceProject_allianceId_projectType_key" ON "AllianceProject"("allianceId", "projectType");
CREATE UNIQUE INDEX "AllianceBonus_allianceId_bonusType_key" ON "AllianceBonus"("allianceId", "bonusType");

CREATE INDEX "AllianceTreasury_worldId_idx" ON "AllianceTreasury"("worldId");
CREATE INDEX "AllianceDonation_worldId_idx" ON "AllianceDonation"("worldId");
CREATE INDEX "AllianceDonation_allianceId_idx" ON "AllianceDonation"("allianceId");
CREATE INDEX "AllianceDonation_playerId_idx" ON "AllianceDonation"("playerId");
CREATE INDEX "AllianceDonation_cityId_idx" ON "AllianceDonation"("cityId");
CREATE INDEX "AllianceDonation_projectId_idx" ON "AllianceDonation"("projectId");
CREATE INDEX "AllianceDonation_createdAt_idx" ON "AllianceDonation"("createdAt");
CREATE INDEX "AllianceProject_worldId_idx" ON "AllianceProject"("worldId");
CREATE INDEX "AllianceProject_allianceId_idx" ON "AllianceProject"("allianceId");
CREATE INDEX "AllianceProject_status_idx" ON "AllianceProject"("status");
CREATE INDEX "AllianceProject_projectType_idx" ON "AllianceProject"("projectType");
CREATE INDEX "AllianceProjectContribution_worldId_idx" ON "AllianceProjectContribution"("worldId");
CREATE INDEX "AllianceProjectContribution_allianceId_idx" ON "AllianceProjectContribution"("allianceId");
CREATE INDEX "AllianceProjectContribution_projectId_idx" ON "AllianceProjectContribution"("projectId");
CREATE INDEX "AllianceProjectContribution_playerId_idx" ON "AllianceProjectContribution"("playerId");
CREATE INDEX "AllianceProjectContribution_donationId_idx" ON "AllianceProjectContribution"("donationId");
CREATE INDEX "AllianceBonus_worldId_idx" ON "AllianceBonus"("worldId");
CREATE INDEX "AllianceBonus_allianceId_idx" ON "AllianceBonus"("allianceId");
CREATE INDEX "AllianceBonus_projectId_idx" ON "AllianceBonus"("projectId");
CREATE INDEX "AllianceHelpRequest_worldId_idx" ON "AllianceHelpRequest"("worldId");
CREATE INDEX "AllianceHelpRequest_allianceId_idx" ON "AllianceHelpRequest"("allianceId");
CREATE INDEX "AllianceHelpRequest_playerId_idx" ON "AllianceHelpRequest"("playerId");
CREATE INDEX "AllianceHelpRequest_status_idx" ON "AllianceHelpRequest"("status");
CREATE INDEX "AllianceTradeRequest_worldId_idx" ON "AllianceTradeRequest"("worldId");
CREATE INDEX "AllianceTradeRequest_allianceId_idx" ON "AllianceTradeRequest"("allianceId");
CREATE INDEX "AllianceTradeRequest_playerId_idx" ON "AllianceTradeRequest"("playerId");
CREATE INDEX "AllianceTradeRequest_status_idx" ON "AllianceTradeRequest"("status");
CREATE INDEX "AllianceSharedBattleReport_worldId_idx" ON "AllianceSharedBattleReport"("worldId");
CREATE INDEX "AllianceSharedBattleReport_allianceId_idx" ON "AllianceSharedBattleReport"("allianceId");
CREATE INDEX "AllianceSharedBattleReport_playerId_idx" ON "AllianceSharedBattleReport"("playerId");
CREATE INDEX "AllianceSharedBattleReport_reportId_idx" ON "AllianceSharedBattleReport"("reportId");
CREATE INDEX "AllianceActivityEntry_worldId_idx" ON "AllianceActivityEntry"("worldId");
CREATE INDEX "AllianceActivityEntry_allianceId_idx" ON "AllianceActivityEntry"("allianceId");
CREATE INDEX "AllianceActivityEntry_playerId_idx" ON "AllianceActivityEntry"("playerId");
CREATE INDEX "AllianceActivityEntry_type_idx" ON "AllianceActivityEntry"("type");
CREATE INDEX "AllianceActivityEntry_createdAt_idx" ON "AllianceActivityEntry"("createdAt");

ALTER TABLE "AllianceTreasury" ADD CONSTRAINT "AllianceTreasury_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceTreasury" ADD CONSTRAINT "AllianceTreasury_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceDonation" ADD CONSTRAINT "AllianceDonation_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceDonation" ADD CONSTRAINT "AllianceDonation_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceDonation" ADD CONSTRAINT "AllianceDonation_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceDonation" ADD CONSTRAINT "AllianceDonation_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceDonation" ADD CONSTRAINT "AllianceDonation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "AllianceProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AllianceProject" ADD CONSTRAINT "AllianceProject_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceProject" ADD CONSTRAINT "AllianceProject_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceProject" ADD CONSTRAINT "AllianceProject_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceProjectContribution" ADD CONSTRAINT "AllianceProjectContribution_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceProjectContribution" ADD CONSTRAINT "AllianceProjectContribution_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceProjectContribution" ADD CONSTRAINT "AllianceProjectContribution_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "AllianceProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceProjectContribution" ADD CONSTRAINT "AllianceProjectContribution_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceBonus" ADD CONSTRAINT "AllianceBonus_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceBonus" ADD CONSTRAINT "AllianceBonus_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceBonus" ADD CONSTRAINT "AllianceBonus_unlockedById_fkey" FOREIGN KEY ("unlockedById") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AllianceHelpRequest" ADD CONSTRAINT "AllianceHelpRequest_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceHelpRequest" ADD CONSTRAINT "AllianceHelpRequest_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceHelpRequest" ADD CONSTRAINT "AllianceHelpRequest_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceHelpRequest" ADD CONSTRAINT "AllianceHelpRequest_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AllianceTradeRequest" ADD CONSTRAINT "AllianceTradeRequest_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceTradeRequest" ADD CONSTRAINT "AllianceTradeRequest_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceTradeRequest" ADD CONSTRAINT "AllianceTradeRequest_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceSharedBattleReport" ADD CONSTRAINT "AllianceSharedBattleReport_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceSharedBattleReport" ADD CONSTRAINT "AllianceSharedBattleReport_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceSharedBattleReport" ADD CONSTRAINT "AllianceSharedBattleReport_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceActivityEntry" ADD CONSTRAINT "AllianceActivityEntry_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceActivityEntry" ADD CONSTRAINT "AllianceActivityEntry_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceActivityEntry" ADD CONSTRAINT "AllianceActivityEntry_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
