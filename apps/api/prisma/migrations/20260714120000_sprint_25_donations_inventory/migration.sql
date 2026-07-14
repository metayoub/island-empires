CREATE TABLE "UserInventoryItem" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "playerId" TEXT,
  "itemId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'available',
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT,
  "metadata" JSONB,
  "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserInventoryItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryTransaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "playerId" TEXT,
  "itemId" TEXT NOT NULL,
  "transactionType" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "balanceAfter" INTEGER,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "targetType" TEXT,
  "targetId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EquippedCosmetic" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "playerId" TEXT,
  "cityId" TEXT,
  "allianceId" TEXT,
  "cosmeticSlot" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "equippedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EquippedCosmetic_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupporterDonation" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "playerId" TEXT,
  "supporterPackId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerSessionId" TEXT,
  "providerPaymentId" TEXT,
  "providerEventId" TEXT,
  "checkoutUrl" TEXT,
  "receiptEmail" TEXT,
  "receiptSentAt" TIMESTAMP(3),
  "fulfilledAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "refundReason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupporterDonation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DonationAuditLog" (
  "id" TEXT NOT NULL,
  "donationId" TEXT,
  "userId" TEXT,
  "playerId" TEXT,
  "actionType" TEXT NOT NULL,
  "statusBefore" TEXT,
  "statusAfter" TEXT,
  "amountCents" INTEGER,
  "currency" TEXT,
  "provider" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DonationAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DonationRefundRecord" (
  "id" TEXT NOT NULL,
  "donationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" TEXT,
  "providerRefundId" TEXT,
  "amountCents" INTEGER,
  "currency" TEXT,
  "reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DonationRefundRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserInventoryItem_userId_itemId_sourceId_key" ON "UserInventoryItem"("userId", "itemId", "sourceId");
CREATE INDEX "UserInventoryItem_userId_idx" ON "UserInventoryItem"("userId");
CREATE INDEX "UserInventoryItem_playerId_idx" ON "UserInventoryItem"("playerId");
CREATE INDEX "UserInventoryItem_itemId_idx" ON "UserInventoryItem"("itemId");
CREATE INDEX "UserInventoryItem_status_idx" ON "UserInventoryItem"("status");
CREATE INDEX "UserInventoryItem_sourceType_idx" ON "UserInventoryItem"("sourceType");
CREATE INDEX "UserInventoryItem_expiresAt_idx" ON "UserInventoryItem"("expiresAt");

CREATE INDEX "InventoryTransaction_userId_idx" ON "InventoryTransaction"("userId");
CREATE INDEX "InventoryTransaction_playerId_idx" ON "InventoryTransaction"("playerId");
CREATE INDEX "InventoryTransaction_itemId_idx" ON "InventoryTransaction"("itemId");
CREATE INDEX "InventoryTransaction_transactionType_idx" ON "InventoryTransaction"("transactionType");
CREATE INDEX "InventoryTransaction_sourceType_idx" ON "InventoryTransaction"("sourceType");
CREATE INDEX "InventoryTransaction_sourceId_idx" ON "InventoryTransaction"("sourceId");
CREATE INDEX "InventoryTransaction_createdAt_idx" ON "InventoryTransaction"("createdAt");

CREATE UNIQUE INDEX "EquippedCosmetic_userId_cosmeticSlot_playerId_cityId_allianceId_key" ON "EquippedCosmetic"("userId", "cosmeticSlot", "playerId", "cityId", "allianceId");
CREATE INDEX "EquippedCosmetic_userId_idx" ON "EquippedCosmetic"("userId");
CREATE INDEX "EquippedCosmetic_playerId_idx" ON "EquippedCosmetic"("playerId");
CREATE INDEX "EquippedCosmetic_cityId_idx" ON "EquippedCosmetic"("cityId");
CREATE INDEX "EquippedCosmetic_allianceId_idx" ON "EquippedCosmetic"("allianceId");
CREATE INDEX "EquippedCosmetic_cosmeticSlot_idx" ON "EquippedCosmetic"("cosmeticSlot");
CREATE INDEX "EquippedCosmetic_itemId_idx" ON "EquippedCosmetic"("itemId");

CREATE INDEX "SupporterDonation_userId_idx" ON "SupporterDonation"("userId");
CREATE INDEX "SupporterDonation_playerId_idx" ON "SupporterDonation"("playerId");
CREATE INDEX "SupporterDonation_supporterPackId_idx" ON "SupporterDonation"("supporterPackId");
CREATE INDEX "SupporterDonation_status_idx" ON "SupporterDonation"("status");
CREATE INDEX "SupporterDonation_provider_idx" ON "SupporterDonation"("provider");
CREATE INDEX "SupporterDonation_providerSessionId_idx" ON "SupporterDonation"("providerSessionId");
CREATE INDEX "SupporterDonation_providerPaymentId_idx" ON "SupporterDonation"("providerPaymentId");
CREATE INDEX "SupporterDonation_providerEventId_idx" ON "SupporterDonation"("providerEventId");
CREATE INDEX "SupporterDonation_createdAt_idx" ON "SupporterDonation"("createdAt");

CREATE INDEX "DonationAuditLog_donationId_idx" ON "DonationAuditLog"("donationId");
CREATE INDEX "DonationAuditLog_userId_idx" ON "DonationAuditLog"("userId");
CREATE INDEX "DonationAuditLog_playerId_idx" ON "DonationAuditLog"("playerId");
CREATE INDEX "DonationAuditLog_actionType_idx" ON "DonationAuditLog"("actionType");
CREATE INDEX "DonationAuditLog_provider_idx" ON "DonationAuditLog"("provider");
CREATE INDEX "DonationAuditLog_createdAt_idx" ON "DonationAuditLog"("createdAt");

CREATE INDEX "DonationRefundRecord_donationId_idx" ON "DonationRefundRecord"("donationId");
CREATE INDEX "DonationRefundRecord_userId_idx" ON "DonationRefundRecord"("userId");
CREATE INDEX "DonationRefundRecord_provider_idx" ON "DonationRefundRecord"("provider");
CREATE INDEX "DonationRefundRecord_status_idx" ON "DonationRefundRecord"("status");
CREATE INDEX "DonationRefundRecord_createdAt_idx" ON "DonationRefundRecord"("createdAt");

ALTER TABLE "UserInventoryItem" ADD CONSTRAINT "UserInventoryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserInventoryItem" ADD CONSTRAINT "UserInventoryItem_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EquippedCosmetic" ADD CONSTRAINT "EquippedCosmetic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EquippedCosmetic" ADD CONSTRAINT "EquippedCosmetic_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EquippedCosmetic" ADD CONSTRAINT "EquippedCosmetic_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EquippedCosmetic" ADD CONSTRAINT "EquippedCosmetic_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupporterDonation" ADD CONSTRAINT "SupporterDonation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupporterDonation" ADD CONSTRAINT "SupporterDonation_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DonationAuditLog" ADD CONSTRAINT "DonationAuditLog_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "SupporterDonation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DonationAuditLog" ADD CONSTRAINT "DonationAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DonationAuditLog" ADD CONSTRAINT "DonationAuditLog_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DonationRefundRecord" ADD CONSTRAINT "DonationRefundRecord_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "SupporterDonation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DonationRefundRecord" ADD CONSTRAINT "DonationRefundRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
