import { Controller, Get } from '@nestjs/common';
import { EmojiVersionService } from 'src/modules/crawler/unicode/version/emoji-version.service';
import { UnicodeVersionService } from 'src/modules/crawler/unicode/version/unicode-version.service';

@Controller()
export class VersionController {
  constructor(
    private readonly unicodeVersionService: UnicodeVersionService,
    private readonly emojiVersionService: EmojiVersionService,
  ) {}

  @Get('unicode')
  public async getUnicodeVersions() {
    return await this.unicodeVersionService.listAll({});
  }

  @Get('emoji')
  public async getEmojiVersions() {
    return await this.emojiVersionService.listAll({});
  }
}
