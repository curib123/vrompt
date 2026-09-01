CREATE TYPE "OAuthProvider" AS ENUM ('GOOGLE', 'GITHUB');

CREATE TABLE "UserIdentity" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "providerUserId" VARCHAR(255) NOT NULL,
    "providerEmail" VARCHAR(320),
    "providerUsername" VARCHAR(255),
    "avatarUrl" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserIdentity_pkey" PRIMARY KEY ("id")
);

INSERT INTO "UserIdentity" (
    "id", "userId", "provider", "providerUserId", "providerEmail", "createdAt", "updatedAt"
)
SELECT
    md5('vrompt:google:' || "googleId")::uuid,
    "id",
    'GOOGLE'::"OAuthProvider",
    "googleId",
    "email",
    "createdAt",
    "updatedAt"
FROM "User"
WHERE "googleId" IS NOT NULL;

CREATE UNIQUE INDEX "UserIdentity_provider_providerUserId_key"
    ON "UserIdentity"("provider", "providerUserId");
CREATE INDEX "UserIdentity_userId_provider_idx"
    ON "UserIdentity"("userId", "provider");

ALTER TABLE "UserIdentity"
ADD CONSTRAINT "UserIdentity_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "User" DROP COLUMN "googleId";
ALTER TABLE "User" DROP COLUMN "passwordHash";
