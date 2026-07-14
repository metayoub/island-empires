CREATE TABLE "MarketplaceOffer" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "creatorPlayerId" TEXT NOT NULL,
    "creatorCityId" TEXT NOT NULL,
    "offerType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "offeredResource" TEXT NOT NULL,
    "offeredAmount" INTEGER NOT NULL,
    "requestedResource" TEXT NOT NULL,
    "requestedAmount" INTEGER NOT NULL,
    "acceptedByPlayerId" TEXT,
    "acceptedByCityId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "payload" JSONB,

    CONSTRAINT "MarketplaceOffer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TradeHistory" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "sellerPlayerId" TEXT NOT NULL,
    "buyerPlayerId" TEXT NOT NULL,
    "sellerCityId" TEXT NOT NULL,
    "buyerCityId" TEXT NOT NULL,
    "resourceFromSeller" TEXT NOT NULL,
    "amountFromSeller" INTEGER NOT NULL,
    "resourceFromBuyer" TEXT NOT NULL,
    "amountFromBuyer" INTEGER NOT NULL,
    "taxFromSellerSide" INTEGER NOT NULL DEFAULT 0,
    "taxFromBuyerSide" INTEGER NOT NULL DEFAULT 0,
    "movementId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SuspiciousTradeLog" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "offerId" TEXT,
    "playerId" TEXT,
    "relatedPlayerId" TEXT,
    "reason" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'low',
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuspiciousTradeLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MarketplaceOffer_worldId_idx" ON "MarketplaceOffer"("worldId");
CREATE INDEX "MarketplaceOffer_creatorPlayerId_idx" ON "MarketplaceOffer"("creatorPlayerId");
CREATE INDEX "MarketplaceOffer_creatorCityId_idx" ON "MarketplaceOffer"("creatorCityId");
CREATE INDEX "MarketplaceOffer_acceptedByPlayerId_idx" ON "MarketplaceOffer"("acceptedByPlayerId");
CREATE INDEX "MarketplaceOffer_acceptedByCityId_idx" ON "MarketplaceOffer"("acceptedByCityId");
CREATE INDEX "MarketplaceOffer_offerType_idx" ON "MarketplaceOffer"("offerType");
CREATE INDEX "MarketplaceOffer_status_idx" ON "MarketplaceOffer"("status");
CREATE INDEX "MarketplaceOffer_offeredResource_idx" ON "MarketplaceOffer"("offeredResource");
CREATE INDEX "MarketplaceOffer_requestedResource_idx" ON "MarketplaceOffer"("requestedResource");
CREATE INDEX "MarketplaceOffer_expiresAt_idx" ON "MarketplaceOffer"("expiresAt");

CREATE INDEX "TradeHistory_worldId_idx" ON "TradeHistory"("worldId");
CREATE INDEX "TradeHistory_offerId_idx" ON "TradeHistory"("offerId");
CREATE INDEX "TradeHistory_sellerPlayerId_idx" ON "TradeHistory"("sellerPlayerId");
CREATE INDEX "TradeHistory_buyerPlayerId_idx" ON "TradeHistory"("buyerPlayerId");
CREATE INDEX "TradeHistory_sellerCityId_idx" ON "TradeHistory"("sellerCityId");
CREATE INDEX "TradeHistory_buyerCityId_idx" ON "TradeHistory"("buyerCityId");

CREATE INDEX "SuspiciousTradeLog_worldId_idx" ON "SuspiciousTradeLog"("worldId");
CREATE INDEX "SuspiciousTradeLog_offerId_idx" ON "SuspiciousTradeLog"("offerId");
CREATE INDEX "SuspiciousTradeLog_playerId_idx" ON "SuspiciousTradeLog"("playerId");
CREATE INDEX "SuspiciousTradeLog_relatedPlayerId_idx" ON "SuspiciousTradeLog"("relatedPlayerId");
CREATE INDEX "SuspiciousTradeLog_severity_idx" ON "SuspiciousTradeLog"("severity");

ALTER TABLE "MarketplaceOffer" ADD CONSTRAINT "MarketplaceOffer_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketplaceOffer" ADD CONSTRAINT "MarketplaceOffer_creatorPlayerId_fkey" FOREIGN KEY ("creatorPlayerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketplaceOffer" ADD CONSTRAINT "MarketplaceOffer_creatorCityId_fkey" FOREIGN KEY ("creatorCityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketplaceOffer" ADD CONSTRAINT "MarketplaceOffer_acceptedByPlayerId_fkey" FOREIGN KEY ("acceptedByPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceOffer" ADD CONSTRAINT "MarketplaceOffer_acceptedByCityId_fkey" FOREIGN KEY ("acceptedByCityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TradeHistory" ADD CONSTRAINT "TradeHistory_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SuspiciousTradeLog" ADD CONSTRAINT "SuspiciousTradeLog_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
