import { PrismaService } from 'src/shared/services/prisma/prisma.service';
import { HttpModule } from '@nestjs/axios';
import { UnicodeController } from './unicode.controller';
import { UnicodeService } from './unicode.service';
import { UnicodeVersionService } from './version/unicode-version.service';
import { CrawlerService } from './crawler/crawler.service';
import { EmojiVersionService } from './version/emoji-version.service';
import { CacheModule, Module } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fsStore = require('cache-manager-fs-hash');

@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: () => ({
        timeout: 15000,
        maxRedirects: 5,
      }),
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: () => ({
        store: fsStore,
        ttl: 100000,
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
