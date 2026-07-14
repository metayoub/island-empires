ALTER TABLE "Island" ALTER COLUMN "maxSlots" SET DEFAULT 12;
ALTER TABLE "PveCamp" ALTER COLUMN "slotIndex" SET DEFAULT 11;

UPDATE "Island"
SET "maxSlots" = 12
WHERE "maxSlots" < 12;

UPDATE "PveCamp"
SET "slotIndex" = 11;
