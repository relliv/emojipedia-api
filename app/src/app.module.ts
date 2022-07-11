import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CrawlerModule } from './modules/crawler/crawler.module';
import { ApiModule } from './modules/api/api.module';

@Module({
  imports: [CrawlerModule, ApiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
