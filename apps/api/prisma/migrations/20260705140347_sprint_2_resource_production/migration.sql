-- CreateTable
CREATE TABLE "CityWorkerAssignment" (
    "cityId" TEXT NOT NULL,
    "woodWorkers" INTEGER NOT NULL DEFAULT 5,
    "goldWorkers" INTEGER NOT NULL DEFAULT 5,
    "idleCitizens" INTEGER NOT NULL DEFAULT 40,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CityWorkerAssignment_pkey" PRIMARY KEY ("cityId")
);

-- CreateTable
CREATE TABLE "ResourceTransaction" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResourceTransaction_worldId_idx" ON "ResourceTransaction"("worldId");

-- CreateIndex
CREATE INDEX "ResourceTransaction_cityId_idx" ON "ResourceTransaction"("cityId");

-- CreateIndex
CREATE INDEX "ResourceTransaction_playerId_idx" ON "ResourceTransaction"("playerId");

-- CreateIndex
CREATE INDEX "ResourceTransaction_transactionType_idx" ON "ResourceTransaction"("transactionType");

-- CreateIndex
CREATE INDEX "ResourceTransaction_resourceType_idx" ON "ResourceTransaction"("resourceType");

-- AddForeignKey
ALTER TABLE "CityWorkerAssignment" ADD CONSTRAINT "CityWorkerAssignment_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceTransaction" ADD CONSTRAINT "ResourceTransaction_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceTransaction" ADD CONSTRAINT "ResourceTransaction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceTransaction" ADD CONSTRAINT "ResourceTransaction_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
