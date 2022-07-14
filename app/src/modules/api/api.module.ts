import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { VersionModule } from './version/version.module';
import { EmojiModule } from './emoji/emoji.module';
import { GroupModule } from './group/group.module';

@Module({
  imports: [
    RouterModule.register([
      {
        path: 'api/v1',
        children: [
          {
            path: 'versions',
            module: VersionModule,
          },
          {
            path: 'emojis',
            module: EmojiModule,
          },
          {
            path: 'groups',
            module: GroupModule,
          },
        ],
      },
    ]),
    VersionModule,
    EmojiModule,
    GroupModule,
  ],
})
export class ApiModule {}
