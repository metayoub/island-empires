CREATE TABLE "AbuseSignal" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "playerId" TEXT,
    "relatedPlayerId" TEXT,
    "cityId" TEXT,
    "allianceId" TEXT,
    "signalType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'low',
    "status" TEXT NOT NULL DEFAULT 'open',
    "score" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT,
    "description" TEXT,
    "reason" TEXT NOT NULL,
    "source" TEXT,
    "targetType" TEXT,
    "targetId" TEXT,
    "ipHash" TEXT,
    "userAgentHash" TEXT,
    "sessionHash" TEXT,
    "payload" JSONB,
    "assignedAdminUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbuseSignal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AbuseSignal_worldId_idx" ON "AbuseSignal"("worldId");
CREATE INDEX "AbuseSignal_playerId_idx" ON "AbuseSignal"("playerId");
CREATE INDEX "AbuseSignal_relatedPlayerId_idx" ON "AbuseSignal"("relatedPlayerId");
CREATE INDEX "AbuseSignal_cityId_idx" ON "AbuseSignal"("cityId");
CREATE INDEX "AbuseSignal_allianceId_idx" ON "AbuseSignal"("allianceId");
CREATE INDEX "AbuseSignal_signalType_idx" ON "AbuseSignal"("signalType");
CREATE INDEX "AbuseSignal_severity_idx" ON "AbuseSignal"("severity");
CREATE INDEX "AbuseSignal_status_idx" ON "AbuseSignal"("status");
CREATE INDEX "AbuseSignal_score_idx" ON "AbuseSignal"("score");
CREATE INDEX "AbuseSignal_targetType_targetId_idx" ON "AbuseSignal"("targetType", "targetId");
CREATE INDEX "AbuseSignal_ipHash_idx" ON "AbuseSignal"("ipHash");
CREATE INDEX "AbuseSignal_userAgentHash_idx" ON "AbuseSignal"("userAgentHash");
CREATE INDEX "AbuseSignal_sessionHash_idx" ON "AbuseSignal"("sessionHash");
CREATE INDEX "AbuseSignal_createdAt_idx" ON "AbuseSignal"("createdAt");

ALTER TABLE "AbuseSignal" ADD CONSTRAINT "AbuseSignal_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AbuseSignal" ADD CONSTRAINT "AbuseSignal_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AbuseSignal" ADD CONSTRAINT "AbuseSignal_relatedPlayerId_fkey" FOREIGN KEY ("relatedPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "SensitiveActionAuditLog" (
    "id" TEXT NOT NULL,
    "worldId" TEXT,
    "userId" TEXT,
    "playerId" TEXT,
    "relatedPlayerId" TEXT,
    "cityId" TEXT,
    "allianceId" TEXT,
    "actionType" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "ipHash" TEXT,
    "userAgentHash" TEXT,
    "sessionHash" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SensitiveActionAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SensitiveActionAuditLog_worldId_idx" ON "SensitiveActionAuditLog"("worldId");
CREATE INDEX "SensitiveActionAuditLog_userId_idx" ON "SensitiveActionAuditLog"("userId");
CREATE INDEX "SensitiveActionAuditLog_playerId_idx" ON "SensitiveActionAuditLog"("playerId");
CREATE INDEX "SensitiveActionAuditLog_relatedPlayerId_idx" ON "SensitiveActionAuditLog"("relatedPlayerId");
CREATE INDEX "SensitiveActionAuditLog_cityId_idx" ON "SensitiveActionAuditLog"("cityId");
CREATE INDEX "SensitiveActionAuditLog_allianceId_idx" ON "SensitiveActionAuditLog"("allianceId");
CREATE INDEX "SensitiveActionAuditLog_actionType_idx" ON "SensitiveActionAuditLog"("actionType");
CREATE INDEX "SensitiveActionAuditLog_targetType_targetId_idx" ON "SensitiveActionAuditLog"("targetType", "targetId");
CREATE INDEX "SensitiveActionAuditLog_ipHash_idx" ON "SensitiveActionAuditLog"("ipHash");
CREATE INDEX "SensitiveActionAuditLog_userAgentHash_idx" ON "SensitiveActionAuditLog"("userAgentHash");
CREATE INDEX "SensitiveActionAuditLog_sessionHash_idx" ON "SensitiveActionAuditLog"("sessionHash");
CREATE INDEX "SensitiveActionAuditLog_createdAt_idx" ON "SensitiveActionAuditLog"("createdAt");

ALTER TABLE "SensitiveActionAuditLog" ADD CONSTRAINT "SensitiveActionAuditLog_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SensitiveActionAuditLog" ADD CONSTRAINT "SensitiveActionAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SensitiveActionAuditLog" ADD CONSTRAINT "SensitiveActionAuditLog_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ActionFrequencyCounter" (
    "id" TEXT NOT NULL,
    "worldId" TEXT,
    "userId" TEXT,
    "playerId" TEXT,
    "actionType" TEXT NOT NULL,
    "windowKey" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "firstSeenAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionFrequencyCounter_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ActionFrequencyCounter_playerId_actionType_windowKey_key" ON "ActionFrequencyCounter"("playerId", "actionType", "windowKey");
CREATE INDEX "ActionFrequencyCounter_worldId_idx" ON "ActionFrequencyCounter"("worldId");
CREATE INDEX "ActionFrequencyCounter_userId_idx" ON "ActionFrequencyCounter"("userId");
CREATE INDEX "ActionFrequencyCounter_playerId_idx" ON "ActionFrequencyCounter"("playerId");
CREATE INDEX "ActionFrequencyCounter_actionType_idx" ON "ActionFrequencyCounter"("actionType");
CREATE INDEX "ActionFrequencyCounter_windowKey_idx" ON "ActionFrequencyCounter"("windowKey");

ALTER TABLE "ActionFrequencyCounter" ADD CONSTRAINT "ActionFrequencyCounter_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActionFrequencyCounter" ADD CONSTRAINT "ActionFrequencyCounter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActionFrequencyCounter" ADD CONSTRAINT "ActionFrequencyCounter_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AccountRiskSignal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "playerId" TEXT,
    "signalType" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "ipHash" TEXT,
    "userAgentHash" TEXT,
    "sessionHash" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountRiskSignal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AccountRiskSignal_userId_idx" ON "AccountRiskSignal"("userId");
CREATE INDEX "AccountRiskSignal_playerId_idx" ON "AccountRiskSignal"("playerId");
CREATE INDEX "AccountRiskSignal_signalType_idx" ON "AccountRiskSignal"("signalType");
CREATE INDEX "AccountRiskSignal_riskLevel_idx" ON "AccountRiskSignal"("riskLevel");
CREATE INDEX "AccountRiskSignal_ipHash_idx" ON "AccountRiskSignal"("ipHash");
CREATE INDEX "AccountRiskSignal_userAgentHash_idx" ON "AccountRiskSignal"("userAgentHash");
CREATE INDEX "AccountRiskSignal_sessionHash_idx" ON "AccountRiskSignal"("sessionHash");
CREATE INDEX "AccountRiskSignal_createdAt_idx" ON "AccountRiskSignal"("createdAt");

ALTER TABLE "AccountRiskSignal" ADD CONSTRAINT "AccountRiskSignal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountRiskSignal" ADD CONSTRAINT "AccountRiskSignal_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
