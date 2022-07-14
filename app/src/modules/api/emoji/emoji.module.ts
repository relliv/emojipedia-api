import { Module } from '@nestjs/common';
import { UnicodeService } from 'src/modules/crawler/unicode/unicode.service';
import { PrismaService } from 'src/shared/services/prisma/prisma.service';
import { EmojiController } from './emoji.controller';

@Module({
  controllers: [EmojiController],
  providers: [PrismaService, UnicodeService],
})
export class EmojiModule {}
