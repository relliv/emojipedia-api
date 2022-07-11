import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CrawlerModule } from './modules/crawler/crawler.module';
import { ApiModule } from './modules/api/api.module';
import { PrismaService } from './shared/services/prisma/prisma.service';

@Module({
  imports: [CrawlerModule, ApiModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
