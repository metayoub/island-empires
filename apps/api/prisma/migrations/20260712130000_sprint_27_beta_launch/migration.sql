CREATE TABLE "BetaInviteCode" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "cohort" TEXT,
  "maxUses" INTEGER NOT NULL DEFAULT 1,
  "usedCount" INTEGER NOT NULL DEFAULT 0,
  "createdByUserId" TEXT,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BetaInviteCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BetaInviteUsage" (
  "id" TEXT NOT NULL,
  "inviteCodeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "playerId" TEXT,
  "cohort" TEXT,
  "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BetaInviteUsage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BetaEmailAllowlist" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "cohort" TEXT,
  "createdByUserId" TEXT,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BetaEmailAllowlist_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BetaAllowlistUsage" (
  "id" TEXT NOT NULL,
  "allowlistId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "playerId" TEXT,
  "cohort" TEXT,
  "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BetaAllowlistUsage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BetaFeedback" (
  "id" TEXT NOT NULL,
  "worldId" TEXT,
  "userId" TEXT NOT NULL,
  "playerId" TEXT,
  "category" TEXT NOT NULL,
  "sentiment" TEXT,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "page" TEXT,
  "status" TEXT NOT NULL DEFAULT 'open',
  "adminNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "reviewedAt" TIMESTAMP(3),

  CONSTRAINT "BetaFeedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BetaMetricSnapshot" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "snapshotDate" TIMESTAMP(3) NOT NULL,
  "metricName" TEXT NOT NULL,
  "metricValue" DOUBLE PRECISION NOT NULL,
  "dimensions" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BetaMetricSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BetaInviteCode_code_key" ON "BetaInviteCode"("code");
CREATE INDEX "BetaInviteCode_code_idx" ON "BetaInviteCode"("code");
CREATE INDEX "BetaInviteCode_status_idx" ON "BetaInviteCode"("status");
CREATE INDEX "BetaInviteCode_cohort_idx" ON "BetaInviteCode"("cohort");
CREATE INDEX "BetaInviteCode_expiresAt_idx" ON "BetaInviteCode"("expiresAt");
CREATE INDEX "BetaInviteUsage_inviteCodeId_idx" ON "BetaInviteUsage"("inviteCodeId");
CREATE INDEX "BetaInviteUsage_userId_idx" ON "BetaInviteUsage"("userId");
CREATE INDEX "BetaInviteUsage_playerId_idx" ON "BetaInviteUsage"("playerId");
CREATE INDEX "BetaInviteUsage_cohort_idx" ON "BetaInviteUsage"("cohort");
CREATE INDEX "BetaInviteUsage_usedAt_idx" ON "BetaInviteUsage"("usedAt");
CREATE UNIQUE INDEX "BetaEmailAllowlist_email_key" ON "BetaEmailAllowlist"("email");
CREATE INDEX "BetaEmailAllowlist_email_idx" ON "BetaEmailAllowlist"("email");
CREATE INDEX "BetaEmailAllowlist_status_idx" ON "BetaEmailAllowlist"("status");
CREATE INDEX "BetaEmailAllowlist_cohort_idx" ON "BetaEmailAllowlist"("cohort");
CREATE INDEX "BetaEmailAllowlist_expiresAt_idx" ON "BetaEmailAllowlist"("expiresAt");
CREATE INDEX "BetaAllowlistUsage_allowlistId_idx" ON "BetaAllowlistUsage"("allowlistId");
CREATE INDEX "BetaAllowlistUsage_userId_idx" ON "BetaAllowlistUsage"("userId");
CREATE INDEX "BetaAllowlistUsage_playerId_idx" ON "BetaAllowlistUsage"("playerId");
CREATE INDEX "BetaAllowlistUsage_cohort_idx" ON "BetaAllowlistUsage"("cohort");
CREATE INDEX "BetaAllowlistUsage_usedAt_idx" ON "BetaAllowlistUsage"("usedAt");
CREATE INDEX "BetaFeedback_worldId_idx" ON "BetaFeedback"("worldId");
CREATE INDEX "BetaFeedback_userId_idx" ON "BetaFeedback"("userId");
CREATE INDEX "BetaFeedback_playerId_idx" ON "BetaFeedback"("playerId");
CREATE INDEX "BetaFeedback_category_idx" ON "BetaFeedback"("category");
CREATE INDEX "BetaFeedback_sentiment_idx" ON "BetaFeedback"("sentiment");
CREATE INDEX "BetaFeedback_status_idx" ON "BetaFeedback"("status");
CREATE INDEX "BetaFeedback_createdAt_idx" ON "BetaFeedback"("createdAt");
CREATE INDEX "BetaMetricSnapshot_worldId_idx" ON "BetaMetricSnapshot"("worldId");
CREATE INDEX "BetaMetricSnapshot_snapshotDate_idx" ON "BetaMetricSnapshot"("snapshotDate");
CREATE INDEX "BetaMetricSnapshot_metricName_idx" ON "BetaMetricSnapshot"("metricName");

ALTER TABLE "BetaInviteUsage" ADD CONSTRAINT "BetaInviteUsage_inviteCodeId_fkey" FOREIGN KEY ("inviteCodeId") REFERENCES "BetaInviteCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BetaInviteUsage" ADD CONSTRAINT "BetaInviteUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BetaInviteUsage" ADD CONSTRAINT "BetaInviteUsage_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BetaAllowlistUsage" ADD CONSTRAINT "BetaAllowlistUsage_allowlistId_fkey" FOREIGN KEY ("allowlistId") REFERENCES "BetaEmailAllowlist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BetaAllowlistUsage" ADD CONSTRAINT "BetaAllowlistUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BetaAllowlistUsage" ADD CONSTRAINT "BetaAllowlistUsage_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BetaFeedback" ADD CONSTRAINT "BetaFeedback_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BetaFeedback" ADD CONSTRAINT "BetaFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BetaFeedback" ADD CONSTRAINT "BetaFeedback_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BetaMetricSnapshot" ADD CONSTRAINT "BetaMetricSnapshot_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
