import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { UnicodeController } from './unicode.controller';
import { UnicodeService } from './unicode.service';

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
  providers: [UnicodeService],
})
export class UnicodeModule {}
