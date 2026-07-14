CREATE TABLE "Alliance" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "tag" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Alliance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AllianceMember" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "allianceId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AllianceMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AllianceApplication" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "allianceId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "message" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "decidedById" TEXT,
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AllianceApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AllianceInvitation" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "allianceId" TEXT NOT NULL,
  "inviteePlayerId" TEXT NOT NULL,
  "invitedById" TEXT NOT NULL,
  "message" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AllianceInvitation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AllianceChatMessage" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "allianceId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AllianceChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AllianceAnnouncement" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "allianceId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AllianceAnnouncement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Alliance_worldId_name_key" ON "Alliance"("worldId", "name");
CREATE UNIQUE INDEX "Alliance_worldId_tag_key" ON "Alliance"("worldId", "tag");
CREATE INDEX "Alliance_worldId_idx" ON "Alliance"("worldId");
CREATE INDEX "Alliance_status_idx" ON "Alliance"("status");

CREATE UNIQUE INDEX "AllianceMember_playerId_key" ON "AllianceMember"("playerId");
CREATE UNIQUE INDEX "AllianceMember_allianceId_playerId_key" ON "AllianceMember"("allianceId", "playerId");
CREATE INDEX "AllianceMember_worldId_idx" ON "AllianceMember"("worldId");
CREATE INDEX "AllianceMember_allianceId_idx" ON "AllianceMember"("allianceId");
CREATE INDEX "AllianceMember_role_idx" ON "AllianceMember"("role");

CREATE UNIQUE INDEX "AllianceApplication_allianceId_playerId_key" ON "AllianceApplication"("allianceId", "playerId");
CREATE INDEX "AllianceApplication_worldId_idx" ON "AllianceApplication"("worldId");
CREATE INDEX "AllianceApplication_allianceId_idx" ON "AllianceApplication"("allianceId");
CREATE INDEX "AllianceApplication_playerId_idx" ON "AllianceApplication"("playerId");
CREATE INDEX "AllianceApplication_status_idx" ON "AllianceApplication"("status");

CREATE UNIQUE INDEX "AllianceInvitation_allianceId_inviteePlayerId_key" ON "AllianceInvitation"("allianceId", "inviteePlayerId");
CREATE INDEX "AllianceInvitation_worldId_idx" ON "AllianceInvitation"("worldId");
CREATE INDEX "AllianceInvitation_allianceId_idx" ON "AllianceInvitation"("allianceId");
CREATE INDEX "AllianceInvitation_inviteePlayerId_idx" ON "AllianceInvitation"("inviteePlayerId");
CREATE INDEX "AllianceInvitation_status_idx" ON "AllianceInvitation"("status");

CREATE INDEX "AllianceChatMessage_worldId_idx" ON "AllianceChatMessage"("worldId");
CREATE INDEX "AllianceChatMessage_allianceId_idx" ON "AllianceChatMessage"("allianceId");
CREATE INDEX "AllianceChatMessage_playerId_idx" ON "AllianceChatMessage"("playerId");
CREATE INDEX "AllianceChatMessage_createdAt_idx" ON "AllianceChatMessage"("createdAt");

CREATE INDEX "AllianceAnnouncement_worldId_idx" ON "AllianceAnnouncement"("worldId");
CREATE INDEX "AllianceAnnouncement_allianceId_idx" ON "AllianceAnnouncement"("allianceId");
CREATE INDEX "AllianceAnnouncement_playerId_idx" ON "AllianceAnnouncement"("playerId");
CREATE INDEX "AllianceAnnouncement_createdAt_idx" ON "AllianceAnnouncement"("createdAt");

ALTER TABLE "Alliance" ADD CONSTRAINT "Alliance_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceMember" ADD CONSTRAINT "AllianceMember_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceMember" ADD CONSTRAINT "AllianceMember_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceMember" ADD CONSTRAINT "AllianceMember_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceApplication" ADD CONSTRAINT "AllianceApplication_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceApplication" ADD CONSTRAINT "AllianceApplication_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceApplication" ADD CONSTRAINT "AllianceApplication_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceInvitation" ADD CONSTRAINT "AllianceInvitation_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceInvitation" ADD CONSTRAINT "AllianceInvitation_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceInvitation" ADD CONSTRAINT "AllianceInvitation_inviteePlayerId_fkey" FOREIGN KEY ("inviteePlayerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceInvitation" ADD CONSTRAINT "AllianceInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceChatMessage" ADD CONSTRAINT "AllianceChatMessage_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceChatMessage" ADD CONSTRAINT "AllianceChatMessage_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceChatMessage" ADD CONSTRAINT "AllianceChatMessage_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceAnnouncement" ADD CONSTRAINT "AllianceAnnouncement_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceAnnouncement" ADD CONSTRAINT "AllianceAnnouncement_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllianceAnnouncement" ADD CONSTRAINT "AllianceAnnouncement_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
