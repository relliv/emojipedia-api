import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { UnicodeModule } from './unicode/unicode.module';

@Module({
  imports: [
    UnicodeModule,
    RouterModule.register([
      {
        path: 'crawler',
        module: UnicodeModule,
      },
    ]),
  ],
})
export class CrawlerModule {}
