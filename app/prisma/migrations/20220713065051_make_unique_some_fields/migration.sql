/*
  Warnings:

  - A unique constraint covering the columns `[emoji]` on the table `Unicode_Emoji` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `Unicode_Emoji` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Unicode_Emoji_emoji_key" ON "Unicode_Emoji"("emoji");

-- CreateIndex
CREATE UNIQUE INDEX "Unicode_Emoji_slug_key" ON "Unicode_Emoji"("slug");
