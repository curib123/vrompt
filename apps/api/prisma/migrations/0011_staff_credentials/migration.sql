CREATE TABLE "StaffCredential" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffCredential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffCredential_userId_key" ON "StaffCredential"("userId");

ALTER TABLE "StaffCredential"
ADD CONSTRAINT "StaffCredential_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
