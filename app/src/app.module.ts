import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CrawlerModule } from './modules/crawler/crawler.module';
import { ApiModule } from './modules/api/api.module';
import { CacheModule, Module } from '@nestjs/common';
import { fsStore } from 'cache-manager-fs';

@Module({
  imports: [
    CrawlerModule,
    ApiModule,
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: () => ({
        store: fsStore,
        // TODO: fix possible file bug
        path: './storage/cache',
        ttl: 60 * 60 * 1,
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
