import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { UnicodeController } from './unicode.controller';

@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: () => ({
        timeout: 5000,
        maxRedirects: 5,
      }),
    }),
  ],
  controllers: [UnicodeController],
})
export class UnicodeModule {}
