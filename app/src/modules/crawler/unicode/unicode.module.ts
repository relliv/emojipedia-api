import { PrismaService } from 'src/shared/services/prisma/prisma.service';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { UnicodeController } from './unicode.controller';
import { UnicodeService } from './unicode.service';
import { UnicodeVersionService } from './version/unicode-version.service';
import { CrawlerService } from './crawler/crawler.service';
import { EmojiVersionService } from './version/emoji-version.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: () => ({
        timeout: 15000,
        maxRedirects: 5,
      }),
    }),
  ],
  controllers: [UnicodeController],
  providers: [
    UnicodeService,
    PrismaService,
    UnicodeVersionService,
    EmojiVersionService,
    CrawlerService,
  ],
})
export class UnicodeModule {}
