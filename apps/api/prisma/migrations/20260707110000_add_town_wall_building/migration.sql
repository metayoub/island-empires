INSERT INTO "CityBuilding" (
  id,
  "cityId",
  "buildingType",
  level,
  "slotIndex",
  status,
  "createdAt",
  "updatedAt"
)
SELECT
  'wall-' || c.id,
  c.id,
  'wall',
  0,
  7,
  'idle',
  NOW(),
  NOW()
FROM "City" c
ON CONFLICT ("cityId", "buildingType") DO NOTHING;
