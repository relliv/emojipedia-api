import { PrismaService } from 'src/shared/services/prisma/prisma.service';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { UnicodeController } from './unicode.controller';
import { UnicodeService } from './unicode.service';
import { VersionService } from './version/version.service';
import { CrawlerService } from './crawler/crawler.service';

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
  providers: [UnicodeService, PrismaService, VersionService, CrawlerService],
})
export class UnicodeModule {}
