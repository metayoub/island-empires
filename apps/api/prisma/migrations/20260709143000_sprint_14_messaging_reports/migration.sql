-- Sprint 14: player messaging, blocks, and moderation queue placeholders.
CREATE TABLE "Message" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "senderPlayerId" TEXT,
  "recipientPlayerId" TEXT NOT NULL,
  "messageType" TEXT NOT NULL DEFAULT 'player',
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "isReadByRecipient" BOOLEAN NOT NULL DEFAULT false,
  "deletedBySender" BOOLEAN NOT NULL DEFAULT false,
  "deletedByRecipient" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),

  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlayerBlock" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "blockerPlayerId" TEXT NOT NULL,
  "blockedPlayerId" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlayerBlock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessageReport" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "reporterPlayerId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),

  CONSTRAINT "MessageReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Message_worldId_idx" ON "Message"("worldId");
CREATE INDEX "Message_senderPlayerId_idx" ON "Message"("senderPlayerId");
CREATE INDEX "Message_recipientPlayerId_idx" ON "Message"("recipientPlayerId");
CREATE INDEX "Message_messageType_idx" ON "Message"("messageType");
CREATE INDEX "Message_isReadByRecipient_idx" ON "Message"("isReadByRecipient");
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

CREATE UNIQUE INDEX "PlayerBlock_blockerPlayerId_blockedPlayerId_key"
  ON "PlayerBlock"("blockerPlayerId", "blockedPlayerId");
CREATE INDEX "PlayerBlock_worldId_idx" ON "PlayerBlock"("worldId");
CREATE INDEX "PlayerBlock_blockerPlayerId_idx" ON "PlayerBlock"("blockerPlayerId");
CREATE INDEX "PlayerBlock_blockedPlayerId_idx" ON "PlayerBlock"("blockedPlayerId");

CREATE UNIQUE INDEX "MessageReport_messageId_reporterPlayerId_key"
  ON "MessageReport"("messageId", "reporterPlayerId");
CREATE INDEX "MessageReport_worldId_idx" ON "MessageReport"("worldId");
CREATE INDEX "MessageReport_messageId_idx" ON "MessageReport"("messageId");
CREATE INDEX "MessageReport_reporterPlayerId_idx" ON "MessageReport"("reporterPlayerId");
CREATE INDEX "MessageReport_status_idx" ON "MessageReport"("status");

ALTER TABLE "Message"
  ADD CONSTRAINT "Message_worldId_fkey"
  FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Message"
  ADD CONSTRAINT "Message_senderPlayerId_fkey"
  FOREIGN KEY ("senderPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Message"
  ADD CONSTRAINT "Message_recipientPlayerId_fkey"
  FOREIGN KEY ("recipientPlayerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlayerBlock"
  ADD CONSTRAINT "PlayerBlock_worldId_fkey"
  FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlayerBlock"
  ADD CONSTRAINT "PlayerBlock_blockerPlayerId_fkey"
  FOREIGN KEY ("blockerPlayerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlayerBlock"
  ADD CONSTRAINT "PlayerBlock_blockedPlayerId_fkey"
  FOREIGN KEY ("blockedPlayerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MessageReport"
  ADD CONSTRAINT "MessageReport_worldId_fkey"
  FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MessageReport"
  ADD CONSTRAINT "MessageReport_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MessageReport"
  ADD CONSTRAINT "MessageReport_reporterPlayerId_fkey"
  FOREIGN KEY ("reporterPlayerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
