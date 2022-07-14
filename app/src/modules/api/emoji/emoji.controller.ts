import { Controller, Get } from '@nestjs/common';
import { UnicodeService } from 'src/modules/crawler/unicode/unicode.service';

@Controller()
export class EmojiController {
  constructor(private readonly unicodeService: UnicodeService) {}

  @Get('unicode')
  public async getUnicodeEmojis() {
    return await this.unicodeService.listAll({
      where: {
        NOT: [
          {
            unicode_VersionId: null,
          },
        ],
      },
      orderBy: {
        slug: 'asc',
      },
    });
  }

  @Get('emoji')
  public async getPureEmojis() {
    return await this.unicodeService.listAll({
      where: {
        NOT: [
          {
            unicode_Emoji_VersionId: null,
          },
        ],
      },
      orderBy: {
        slug: 'asc',
      },
    });
  }
}
