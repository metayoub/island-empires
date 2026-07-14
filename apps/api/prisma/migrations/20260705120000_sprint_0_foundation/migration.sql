CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "World" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'development',
    "speedBuilding" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "speedResearch" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "speedResource" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "speedTravel" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "World_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "population" INTEGER NOT NULL DEFAULT 50,
    "happiness" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CityResource" (
    "cityId" TEXT NOT NULL,
    "wood" INTEGER NOT NULL DEFAULT 0,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "marble" INTEGER NOT NULL DEFAULT 0,
    "wine" INTEGER NOT NULL DEFAULT 0,
    "crystal" INTEGER NOT NULL DEFAULT 0,
    "sulfur" INTEGER NOT NULL DEFAULT 0,
    "lastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CityResource_pkey" PRIMARY KEY ("cityId")
);

CREATE TABLE "CityBuilding" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "buildingType" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "slotIndex" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "upgradeStartedAt" TIMESTAMP(3),
    "upgradeFinishesAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CityBuilding_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Player_worldId_name_key" ON "Player"("worldId", "name");
CREATE INDEX "Player_userId_idx" ON "Player"("userId");
CREATE INDEX "City_worldId_idx" ON "City"("worldId");
CREATE INDEX "City_playerId_idx" ON "City"("playerId");
CREATE UNIQUE INDEX "CityBuilding_cityId_buildingType_key" ON "CityBuilding"("cityId", "buildingType");
CREATE INDEX "CityBuilding_cityId_idx" ON "CityBuilding"("cityId");

ALTER TABLE "Player" ADD CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Player" ADD CONSTRAINT "Player_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "City" ADD CONSTRAINT "City_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "City" ADD CONSTRAINT "City_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CityResource" ADD CONSTRAINT "CityResource_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CityBuilding" ADD CONSTRAINT "CityBuilding_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
