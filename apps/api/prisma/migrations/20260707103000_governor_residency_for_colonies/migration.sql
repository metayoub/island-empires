WITH ranked_palaces AS (
  SELECT
    cb.id,
    cb."cityId",
    ROW_NUMBER() OVER (
      PARTITION BY c."playerId"
      ORDER BY c."createdAt" ASC, c.id ASC
    ) AS city_rank
  FROM "CityBuilding" cb
  JOIN "City" c ON c.id = cb."cityId"
  WHERE cb."buildingType" = 'palace'
)
DELETE FROM "CityBuilding" cb
USING ranked_palaces rp
WHERE cb.id = rp.id
  AND rp.city_rank > 1
  AND EXISTS (
    SELECT 1
    FROM "CityBuilding" existing
    WHERE existing."cityId" = rp."cityId"
      AND existing."buildingType" = 'governor_residency'
  );

WITH ranked_palaces AS (
  SELECT
    cb.id,
    cb."cityId",
    ROW_NUMBER() OVER (
      PARTITION BY c."playerId"
      ORDER BY c."createdAt" ASC, c.id ASC
    ) AS city_rank
  FROM "CityBuilding" cb
  JOIN "City" c ON c.id = cb."cityId"
  WHERE cb."buildingType" = 'palace'
)
UPDATE "CityBuilding" cb
SET "buildingType" = 'governor_residency'
FROM ranked_palaces rp
WHERE cb.id = rp.id
  AND rp.city_rank > 1;
