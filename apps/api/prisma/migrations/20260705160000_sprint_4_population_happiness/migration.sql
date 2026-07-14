ALTER TABLE "City"
ADD COLUMN "populationCapacity" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN "populationLastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "City"
SET
  "population" = COALESCE("population", 50),
  "populationCapacity" = 100,
  "happiness" = COALESCE("happiness", 100),
  "populationLastCalculatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "CityBuilding" ("id", "cityId", "buildingType", "level", "slotIndex", "status", "createdAt", "updatedAt")
SELECT c."id" || '-tavern', c."id", 'tavern', 0, 5, 'idle', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "City" c
WHERE NOT EXISTS (
  SELECT 1
  FROM "CityBuilding" b
  WHERE b."cityId" = c."id" AND b."buildingType" = 'tavern'
);
