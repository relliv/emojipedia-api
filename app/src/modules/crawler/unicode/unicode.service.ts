import { Injectable } from '@nestjs/common';
import { Unicode_Emoji, Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/services/prisma/prisma.service';

@Injectable()
export class UnicodeService {
  constructor(private prisma: PrismaService) {}

  async unicodeEmoji(
    userWhereUniqueInput: Prisma.Unicode_EmojiWhereUniqueInput,
  ): Promise<Unicode_Emoji | null> {
    return this.prisma.unicode_Emoji.findUnique({
      where: userWhereUniqueInput,
    });
  }

  async unicodeEmojis(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.Unicode_EmojiWhereUniqueInput;
    where?: Prisma.Unicode_EmojiWhereInput;
    orderBy?: Prisma.Unicode_EmojiOrderByWithRelationInput;
  }): Promise<Unicode_Emoji[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.unicode_Emoji.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async createUnicodeEmoji(
    data: Prisma.Unicode_EmojiCreateInput,
  ): Promise<Unicode_Emoji> {
    return this.prisma.unicode_Emoji.create({
      data,
    });
  }

  async updateUnicodeEmoji(params: {
    where: Prisma.Unicode_EmojiWhereUniqueInput;
    data: Prisma.Unicode_EmojiUpdateInput;
  }): Promise<Unicode_Emoji> {
    const { where, data } = params;
    return this.prisma.unicode_Emoji.update({
      data,
      where,
    });
  }

  async deleteUnicodeEmoji(
    where: Prisma.Unicode_EmojiWhereUniqueInput,
  ): Promise<Unicode_Emoji> {
    return this.prisma.unicode_Emoji.delete({
      where,
    });
  }
}
