ALTER TABLE "Player" ADD COLUMN "avatarFrame" TEXT;
ALTER TABLE "Player" ADD COLUMN "premiumUntil" TIMESTAMP(3);
ALTER TABLE "City" ADD COLUMN "citySkin" TEXT;
ALTER TABLE "Alliance" ADD COLUMN "bannerCosmetic" TEXT;

CREATE TABLE "PlayerPremiumWallet" (
  "playerId" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "balance" INTEGER NOT NULL DEFAULT 0,
  "lifetimePurchased" INTEGER NOT NULL DEFAULT 0,
  "lifetimeSpent" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PlayerPremiumWallet_pkey" PRIMARY KEY ("playerId")
);

CREATE TABLE "PremiumPurchase" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "itemName" TEXT NOT NULL,
  "premiumCurrencyAmount" INTEGER NOT NULL DEFAULT 0,
  "premiumCurrencyCost" INTEGER NOT NULL DEFAULT 0,
  "moneyAmountCents" INTEGER NOT NULL DEFAULT 0,
  "currencyCode" TEXT NOT NULL DEFAULT 'USD',
  "provider" TEXT NOT NULL,
  "providerSessionId" TEXT,
  "providerPaymentId" TEXT,
  "providerCustomerId" TEXT,
  "providerEventId" TEXT,
  "checkoutUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'completed',
  "receiptEmail" TEXT,
  "receiptSentAt" TIMESTAMP(3),
  "fulfilledAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "refundReason" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PremiumPurchase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PremiumLedgerEntry" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "playerId" TEXT,
  "entryType" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "reason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PremiumLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CosmeticInventoryItem" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "playerId" TEXT,
  "itemType" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT,
  "equippedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CosmeticInventoryItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PremiumEntitlement" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "purchaseId" TEXT,
  "itemId" TEXT NOT NULL,
  "itemType" TEXT NOT NULL,
  "targetType" TEXT,
  "targetId" TEXT,
  "cityId" TEXT,
  "allianceId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3),
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PremiumEntitlement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PremiumRefund" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "purchaseId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL DEFAULT 0,
  "premiumCurrency" INTEGER NOT NULL DEFAULT 0,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "providerRefundId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PremiumRefund_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PremiumAuditLog" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "userId" TEXT,
  "purchaseId" TEXT,
  "actionType" TEXT NOT NULL,
  "targetType" TEXT,
  "targetId" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PremiumAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PremiumPurchase_provider_providerPaymentId_key" ON "PremiumPurchase"("provider", "providerPaymentId");
CREATE INDEX "PlayerPremiumWallet_worldId_idx" ON "PlayerPremiumWallet"("worldId");
CREATE INDEX "PremiumPurchase_worldId_idx" ON "PremiumPurchase"("worldId");
CREATE INDEX "PremiumPurchase_playerId_idx" ON "PremiumPurchase"("playerId");
CREATE INDEX "PremiumPurchase_userId_idx" ON "PremiumPurchase"("userId");
CREATE INDEX "PremiumPurchase_status_idx" ON "PremiumPurchase"("status");
CREATE INDEX "PremiumPurchase_providerSessionId_idx" ON "PremiumPurchase"("providerSessionId");
CREATE INDEX "PremiumPurchase_createdAt_idx" ON "PremiumPurchase"("createdAt");
CREATE INDEX "PremiumPurchase_providerPaymentId_idx" ON "PremiumPurchase"("providerPaymentId");
CREATE INDEX "PremiumPurchase_providerEventId_idx" ON "PremiumPurchase"("providerEventId");
CREATE INDEX "PremiumLedgerEntry_worldId_idx" ON "PremiumLedgerEntry"("worldId");
CREATE INDEX "PremiumLedgerEntry_userId_idx" ON "PremiumLedgerEntry"("userId");
CREATE INDEX "PremiumLedgerEntry_playerId_idx" ON "PremiumLedgerEntry"("playerId");
CREATE INDEX "PremiumLedgerEntry_entryType_idx" ON "PremiumLedgerEntry"("entryType");
CREATE INDEX "PremiumLedgerEntry_referenceType_idx" ON "PremiumLedgerEntry"("referenceType");
CREATE INDEX "PremiumLedgerEntry_referenceId_idx" ON "PremiumLedgerEntry"("referenceId");
CREATE INDEX "PremiumLedgerEntry_createdAt_idx" ON "PremiumLedgerEntry"("createdAt");
CREATE UNIQUE INDEX "CosmeticInventoryItem_userId_itemId_key" ON "CosmeticInventoryItem"("userId", "itemId");
CREATE INDEX "CosmeticInventoryItem_worldId_idx" ON "CosmeticInventoryItem"("worldId");
CREATE INDEX "CosmeticInventoryItem_userId_idx" ON "CosmeticInventoryItem"("userId");
CREATE INDEX "CosmeticInventoryItem_playerId_idx" ON "CosmeticInventoryItem"("playerId");
CREATE INDEX "CosmeticInventoryItem_itemType_idx" ON "CosmeticInventoryItem"("itemType");
CREATE INDEX "CosmeticInventoryItem_itemId_idx" ON "CosmeticInventoryItem"("itemId");
CREATE INDEX "CosmeticInventoryItem_equippedAt_idx" ON "CosmeticInventoryItem"("equippedAt");
CREATE INDEX "PremiumEntitlement_worldId_idx" ON "PremiumEntitlement"("worldId");
CREATE INDEX "PremiumEntitlement_playerId_idx" ON "PremiumEntitlement"("playerId");
CREATE INDEX "PremiumEntitlement_purchaseId_idx" ON "PremiumEntitlement"("purchaseId");
CREATE INDEX "PremiumEntitlement_itemId_idx" ON "PremiumEntitlement"("itemId");
CREATE INDEX "PremiumEntitlement_itemType_idx" ON "PremiumEntitlement"("itemType");
CREATE INDEX "PremiumEntitlement_targetType_targetId_idx" ON "PremiumEntitlement"("targetType", "targetId");
CREATE INDEX "PremiumEntitlement_status_idx" ON "PremiumEntitlement"("status");
CREATE INDEX "PremiumRefund_worldId_idx" ON "PremiumRefund"("worldId");
CREATE INDEX "PremiumRefund_purchaseId_idx" ON "PremiumRefund"("purchaseId");
CREATE INDEX "PremiumRefund_playerId_idx" ON "PremiumRefund"("playerId");
CREATE INDEX "PremiumRefund_userId_idx" ON "PremiumRefund"("userId");
CREATE INDEX "PremiumRefund_status_idx" ON "PremiumRefund"("status");
CREATE INDEX "PremiumRefund_createdAt_idx" ON "PremiumRefund"("createdAt");
CREATE INDEX "PremiumAuditLog_worldId_idx" ON "PremiumAuditLog"("worldId");
CREATE INDEX "PremiumAuditLog_playerId_idx" ON "PremiumAuditLog"("playerId");
CREATE INDEX "PremiumAuditLog_userId_idx" ON "PremiumAuditLog"("userId");
CREATE INDEX "PremiumAuditLog_purchaseId_idx" ON "PremiumAuditLog"("purchaseId");
CREATE INDEX "PremiumAuditLog_actionType_idx" ON "PremiumAuditLog"("actionType");
CREATE INDEX "PremiumAuditLog_createdAt_idx" ON "PremiumAuditLog"("createdAt");

ALTER TABLE "PlayerPremiumWallet" ADD CONSTRAINT "PlayerPremiumWallet_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlayerPremiumWallet" ADD CONSTRAINT "PlayerPremiumWallet_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PremiumPurchase" ADD CONSTRAINT "PremiumPurchase_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PremiumPurchase" ADD CONSTRAINT "PremiumPurchase_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PremiumPurchase" ADD CONSTRAINT "PremiumPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PremiumLedgerEntry" ADD CONSTRAINT "PremiumLedgerEntry_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PremiumLedgerEntry" ADD CONSTRAINT "PremiumLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PremiumLedgerEntry" ADD CONSTRAINT "PremiumLedgerEntry_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CosmeticInventoryItem" ADD CONSTRAINT "CosmeticInventoryItem_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CosmeticInventoryItem" ADD CONSTRAINT "CosmeticInventoryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CosmeticInventoryItem" ADD CONSTRAINT "CosmeticInventoryItem_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PremiumEntitlement" ADD CONSTRAINT "PremiumEntitlement_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PremiumEntitlement" ADD CONSTRAINT "PremiumEntitlement_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PremiumEntitlement" ADD CONSTRAINT "PremiumEntitlement_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "PremiumPurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PremiumEntitlement" ADD CONSTRAINT "PremiumEntitlement_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PremiumEntitlement" ADD CONSTRAINT "PremiumEntitlement_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PremiumRefund" ADD CONSTRAINT "PremiumRefund_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PremiumRefund" ADD CONSTRAINT "PremiumRefund_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "PremiumPurchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PremiumRefund" ADD CONSTRAINT "PremiumRefund_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PremiumAuditLog" ADD CONSTRAINT "PremiumAuditLog_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PremiumAuditLog" ADD CONSTRAINT "PremiumAuditLog_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PremiumAuditLog" ADD CONSTRAINT "PremiumAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PremiumAuditLog" ADD CONSTRAINT "PremiumAuditLog_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "PremiumPurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
