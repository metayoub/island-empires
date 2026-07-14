-- Sprint 21 Notifications and Browser Push

CREATE TABLE "NotificationPreference" (
  "playerId" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "inGameEnabled" BOOLEAN NOT NULL DEFAULT true,
  "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
  "browserPushEnabled" BOOLEAN NOT NULL DEFAULT false,
  "constructionCompleted" BOOLEAN NOT NULL DEFAULT true,
  "researchCompleted" BOOLEAN NOT NULL DEFAULT true,
  "tradeArrived" BOOLEAN NOT NULL DEFAULT true,
  "armyReturned" BOOLEAN NOT NULL DEFAULT true,
  "incomingAttack" BOOLEAN NOT NULL DEFAULT true,
  "allianceMessage" BOOLEAN NOT NULL DEFAULT true,
  "warehouseFull" BOOLEAN NOT NULL DEFAULT true,
  "eventEnding" BOOLEAN NOT NULL DEFAULT true,
  "quietHoursStart" INTEGER,
  "quietHoursEnd" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("playerId")
);

CREATE TABLE "BrowserPushSubscription" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "userAgent" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BrowserPushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationDelivery" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "cityId" TEXT,
  "reportId" TEXT,
  "messageId" TEXT,
  "type" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deliveredAt" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BrowserPushSubscription_endpoint_key" ON "BrowserPushSubscription"("endpoint");
CREATE UNIQUE INDEX "NotificationDelivery_reportId_channel_key" ON "NotificationDelivery"("reportId", "channel");
CREATE UNIQUE INDEX "NotificationDelivery_messageId_channel_key" ON "NotificationDelivery"("messageId", "channel");

CREATE INDEX "NotificationPreference_worldId_idx" ON "NotificationPreference"("worldId");
CREATE INDEX "BrowserPushSubscription_worldId_idx" ON "BrowserPushSubscription"("worldId");
CREATE INDEX "BrowserPushSubscription_playerId_idx" ON "BrowserPushSubscription"("playerId");
CREATE INDEX "BrowserPushSubscription_userId_idx" ON "BrowserPushSubscription"("userId");
CREATE INDEX "BrowserPushSubscription_enabled_idx" ON "BrowserPushSubscription"("enabled");
CREATE INDEX "NotificationDelivery_worldId_idx" ON "NotificationDelivery"("worldId");
CREATE INDEX "NotificationDelivery_playerId_idx" ON "NotificationDelivery"("playerId");
CREATE INDEX "NotificationDelivery_cityId_idx" ON "NotificationDelivery"("cityId");
CREATE INDEX "NotificationDelivery_type_idx" ON "NotificationDelivery"("type");
CREATE INDEX "NotificationDelivery_channel_idx" ON "NotificationDelivery"("channel");
CREATE INDEX "NotificationDelivery_status_idx" ON "NotificationDelivery"("status");
CREATE INDEX "NotificationDelivery_archivedAt_idx" ON "NotificationDelivery"("archivedAt");
CREATE INDEX "NotificationDelivery_createdAt_idx" ON "NotificationDelivery"("createdAt");

ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BrowserPushSubscription" ADD CONSTRAINT "BrowserPushSubscription_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BrowserPushSubscription" ADD CONSTRAINT "BrowserPushSubscription_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BrowserPushSubscription" ADD CONSTRAINT "BrowserPushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
