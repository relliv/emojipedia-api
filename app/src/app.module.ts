import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CrawlerModule } from './modules/crawler/crawler.module';
import { ApiModule } from './modules/api/api.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [CrawlerModule, ApiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
