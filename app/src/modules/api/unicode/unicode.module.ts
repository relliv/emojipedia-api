import { Module } from '@nestjs/common';
import { UnicodeController } from './unicode.controller';

@Module({
  controllers: [UnicodeController],
})
export class UnicodeModule {}
