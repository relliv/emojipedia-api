import { Module } from '@nestjs/common';
import { EmojiVersionService } from 'src/modules/crawler/unicode/version/emoji-version.service';
import { UnicodeVersionService } from 'src/modules/crawler/unicode/version/unicode-version.service';
import { PrismaService } from 'src/shared/services/prisma/prisma.service';
import { VersionController } from './version.controller';

@Module({
  controllers: [VersionController],
  providers: [PrismaService, EmojiVersionService, UnicodeVersionService],
})
export class VersionModule {}
