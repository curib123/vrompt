ALTER TABLE "Bookmark"
  ADD COLUMN "lastUsedAt" TIMESTAMP(3),
  ADD COLUMN "useCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "isFavorite" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Bookmark_userId_isPinned_isFavorite_lastUsedAt_idx"
  ON "Bookmark"("userId", "isPinned", "isFavorite", "lastUsedAt");
