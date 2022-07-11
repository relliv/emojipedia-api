-- CreateTable
CREATE TABLE "Unicode_Emoji" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "emoji" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "known_as" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "codepoint" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "proposal" TEXT NOT NULL,
    "isSupportingByChromium" BOOLEAN NOT NULL DEFAULT false,
    "testedChromiumVersion" TEXT NOT NULL,
    "emojipedia_page" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Unicode_Emoji_Keyword" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Unicode_Emojis_Keywords" (
    "emojiId" INTEGER NOT NULL,
    "keywordId" INTEGER NOT NULL,

    PRIMARY KEY ("emojiId", "keywordId"),
    CONSTRAINT "Unicode_Emojis_Keywords_emojiId_fkey" FOREIGN KEY ("emojiId") REFERENCES "Unicode_Emoji" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Unicode_Emojis_Keywords_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Unicode_Emoji_Keyword" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
