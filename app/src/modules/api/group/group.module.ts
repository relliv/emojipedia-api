import { Module } from '@nestjs/common';
import { UnicodeService } from 'src/modules/crawler/unicode/unicode.service';
import { PrismaService } from 'src/shared/services/prisma/prisma.service';
import { GroupController } from './group.controller';

@Module({
  controllers: [GroupController],
  providers: [PrismaService, UnicodeService],
})
export class GroupModule {}
