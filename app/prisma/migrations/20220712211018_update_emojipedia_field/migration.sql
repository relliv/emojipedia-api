/*
  Warnings:

  - You are about to drop the column `emojipedia_page` on the `Unicode_Emoji` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Unicode_Emoji" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "emoji" TEXT NOT NULL,
    "name" TEXT,
    "known_as" TEXT,
    "description" TEXT,
    "codepoint" TEXT,
    "shortCode" TEXT,
    "versionId" INTEGER,
    "proposal" TEXT,
    "isSupportingByChromium" BOOLEAN DEFAULT false,
    "testedChromiumVersion" TEXT,
    "emojipediaPage" TEXT,
    "keywords" TEXT,
    CONSTRAINT "Unicode_Emoji_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Unicode_Emoji_Version" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Unicode_Emoji" ("codepoint", "description", "emoji", "id", "isSupportingByChromium", "keywords", "known_as", "name", "proposal", "shortCode", "testedChromiumVersion", "versionId") SELECT "codepoint", "description", "emoji", "id", "isSupportingByChromium", "keywords", "known_as", "name", "proposal", "shortCode", "testedChromiumVersion", "versionId" FROM "Unicode_Emoji";
DROP TABLE "Unicode_Emoji";
ALTER TABLE "new_Unicode_Emoji" RENAME TO "Unicode_Emoji";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
