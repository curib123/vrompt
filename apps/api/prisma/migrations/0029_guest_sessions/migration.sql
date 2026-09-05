ALTER TABLE "User" ADD COLUMN "guestKey" VARCHAR(64), ADD COLUMN "guestExpiresAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "User_guestKey_key" ON "User"("guestKey");
