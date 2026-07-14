ALTER TABLE "User" ADD COLUMN "adminRole" TEXT NOT NULL DEFAULT 'viewer';

CREATE TABLE "PlayerModeration" (
  "playerId" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'clear',
  "warningCount" INTEGER NOT NULL DEFAULT 0,
  "mutedUntil" TIMESTAMP(3),
  "suspendedUntil" TIMESTAMP(3),
  "bannedAt" TIMESTAMP(3),
  "reason" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PlayerModeration_pkey" PRIMARY KEY ("playerId")
);

CREATE TABLE "AdminPlayerWarning" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "adminUserId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "message" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AdminPlayerWarning_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminPlayerNote" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "adminUserId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "AdminPlayerNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminActionLog" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "adminUserId" TEXT NOT NULL,
  "actionType" TEXT NOT NULL,
  "targetType" TEXT,
  "targetId" TEXT,
  "playerId" TEXT,
  "reason" TEXT,
  "payloadBefore" JSONB,
  "payloadAfter" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AdminActionLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminRole" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "grantedByUserId" TEXT,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AdminRole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlayerModerationAction" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "adminUserId" TEXT NOT NULL,
  "actionType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "reason" TEXT NOT NULL,
  "internalNote" TEXT,
  "publicMessage" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "revokedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PlayerModerationAction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "User_adminRole_idx" ON "User"("adminRole");

CREATE INDEX "PlayerModeration_worldId_idx" ON "PlayerModeration"("worldId");
CREATE INDEX "PlayerModeration_status_idx" ON "PlayerModeration"("status");
CREATE INDEX "PlayerModeration_mutedUntil_idx" ON "PlayerModeration"("mutedUntil");
CREATE INDEX "PlayerModeration_suspendedUntil_idx" ON "PlayerModeration"("suspendedUntil");
CREATE INDEX "PlayerModeration_bannedAt_idx" ON "PlayerModeration"("bannedAt");

CREATE INDEX "AdminPlayerWarning_worldId_idx" ON "AdminPlayerWarning"("worldId");
CREATE INDEX "AdminPlayerWarning_playerId_idx" ON "AdminPlayerWarning"("playerId");
CREATE INDEX "AdminPlayerWarning_adminUserId_idx" ON "AdminPlayerWarning"("adminUserId");
CREATE INDEX "AdminPlayerWarning_createdAt_idx" ON "AdminPlayerWarning"("createdAt");

CREATE INDEX "AdminPlayerNote_worldId_idx" ON "AdminPlayerNote"("worldId");
CREATE INDEX "AdminPlayerNote_playerId_idx" ON "AdminPlayerNote"("playerId");
CREATE INDEX "AdminPlayerNote_userId_idx" ON "AdminPlayerNote"("userId");
CREATE INDEX "AdminPlayerNote_adminUserId_idx" ON "AdminPlayerNote"("adminUserId");
CREATE INDEX "AdminPlayerNote_createdAt_idx" ON "AdminPlayerNote"("createdAt");

CREATE INDEX "AdminActionLog_worldId_idx" ON "AdminActionLog"("worldId");
CREATE INDEX "AdminActionLog_adminUserId_idx" ON "AdminActionLog"("adminUserId");
CREATE INDEX "AdminActionLog_actionType_idx" ON "AdminActionLog"("actionType");
CREATE INDEX "AdminActionLog_targetType_idx" ON "AdminActionLog"("targetType");
CREATE INDEX "AdminActionLog_targetId_idx" ON "AdminActionLog"("targetId");
CREATE INDEX "AdminActionLog_playerId_idx" ON "AdminActionLog"("playerId");
CREATE INDEX "AdminActionLog_createdAt_idx" ON "AdminActionLog"("createdAt");

CREATE INDEX "AdminRole_userId_idx" ON "AdminRole"("userId");
CREATE INDEX "AdminRole_role_idx" ON "AdminRole"("role");
CREATE INDEX "AdminRole_revokedAt_idx" ON "AdminRole"("revokedAt");

CREATE INDEX "PlayerModerationAction_worldId_idx" ON "PlayerModerationAction"("worldId");
CREATE INDEX "PlayerModerationAction_playerId_idx" ON "PlayerModerationAction"("playerId");
CREATE INDEX "PlayerModerationAction_userId_idx" ON "PlayerModerationAction"("userId");
CREATE INDEX "PlayerModerationAction_adminUserId_idx" ON "PlayerModerationAction"("adminUserId");
CREATE INDEX "PlayerModerationAction_actionType_idx" ON "PlayerModerationAction"("actionType");
CREATE INDEX "PlayerModerationAction_status_idx" ON "PlayerModerationAction"("status");
CREATE INDEX "PlayerModerationAction_endsAt_idx" ON "PlayerModerationAction"("endsAt");

ALTER TABLE "PlayerModeration" ADD CONSTRAINT "PlayerModeration_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlayerModeration" ADD CONSTRAINT "PlayerModeration_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AdminPlayerWarning" ADD CONSTRAINT "AdminPlayerWarning_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdminPlayerWarning" ADD CONSTRAINT "AdminPlayerWarning_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdminPlayerWarning" ADD CONSTRAINT "AdminPlayerWarning_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AdminPlayerNote" ADD CONSTRAINT "AdminPlayerNote_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdminPlayerNote" ADD CONSTRAINT "AdminPlayerNote_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdminPlayerNote" ADD CONSTRAINT "AdminPlayerNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdminPlayerNote" ADD CONSTRAINT "AdminPlayerNote_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AdminActionLog" ADD CONSTRAINT "AdminActionLog_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdminActionLog" ADD CONSTRAINT "AdminActionLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AdminRole" ADD CONSTRAINT "AdminRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdminRole" ADD CONSTRAINT "AdminRole_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlayerModerationAction" ADD CONSTRAINT "PlayerModerationAction_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlayerModerationAction" ADD CONSTRAINT "PlayerModerationAction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlayerModerationAction" ADD CONSTRAINT "PlayerModerationAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlayerModerationAction" ADD CONSTRAINT "PlayerModerationAction_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlayerModerationAction" ADD CONSTRAINT "PlayerModerationAction_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
