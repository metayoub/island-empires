ALTER TABLE "User" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "User_isAdmin_idx" ON "User"("isAdmin");
