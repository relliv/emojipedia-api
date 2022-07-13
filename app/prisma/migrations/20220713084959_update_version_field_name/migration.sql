/*
  Warnings:

  - You are about to drop the column `unicode_Emoji_Version` on the `Unicode_Emoji` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Unicode_Emoji" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "emoji" TEXT NOT NULL,
    "name" TEXT,
    "known_as" TEXT,
    "description" TEXT,
    "codePoint" TEXT,
    "shortCode" TEXT,
    "isLayered" BOOLEAN DEFAULT false,
    "unicode_Emoji_VersionId" INTEGER,
    "proposal" TEXT,
    "isSupportingByChromium" BOOLEAN DEFAULT false,
    "testedChromiumVersion" TEXT,
    "slug" TEXT,
    "keywords" TEXT,
    "unicode_VersionId" INTEGER,
    CONSTRAINT "Unicode_Emoji_unicode_VersionId_fkey" FOREIGN KEY ("unicode_VersionId") REFERENCES "Unicode_Version" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Unicode_Emoji_unicode_Emoji_VersionId_fkey" FOREIGN KEY ("unicode_Emoji_VersionId") REFERENCES "Unicode_Emoji_Version" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Unicode_Emoji" ("codePoint", "description", "emoji", "id", "isLayered", "isSupportingByChromium", "keywords", "known_as", "name", "proposal", "shortCode", "slug", "testedChromiumVersion", "unicode_VersionId") SELECT "codePoint", "description", "emoji", "id", "isLayered", "isSupportingByChromium", "keywords", "known_as", "name", "proposal", "shortCode", "slug", "testedChromiumVersion", "unicode_VersionId" FROM "Unicode_Emoji";
DROP TABLE "Unicode_Emoji";
ALTER TABLE "new_Unicode_Emoji" RENAME TO "Unicode_Emoji";
CREATE UNIQUE INDEX "Unicode_Emoji_emoji_key" ON "Unicode_Emoji"("emoji");
CREATE UNIQUE INDEX "Unicode_Emoji_slug_key" ON "Unicode_Emoji"("slug");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
