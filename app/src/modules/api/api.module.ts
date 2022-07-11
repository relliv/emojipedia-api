import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { UnicodeModule } from './unicode/unicode.module';

@Module({
  imports: [
    UnicodeModule,
    RouterModule.register([
      {
        path: 'api',
        module: UnicodeModule,
      },
    ]),
  ],
})
export class ApiModule {}
