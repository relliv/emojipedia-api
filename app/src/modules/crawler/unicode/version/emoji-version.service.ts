import { Injectable } from '@nestjs/common';
import { Unicode_Emoji_Version, Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/services/prisma/prisma.service';

@Injectable()
export class EmojiVersionService {
  constructor(private prisma: PrismaService) {}

  async findOne(
    userWhereUniqueInput: Prisma.Unicode_Emoji_VersionWhereUniqueInput,
  ): Promise<Unicode_Emoji_Version | null> {
    return this.prisma.unicode_Emoji_Version.findUnique({
      where: userWhereUniqueInput,
    });
  }

  async list(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.Unicode_Emoji_VersionWhereUniqueInput;
    where?: Prisma.Unicode_Emoji_VersionWhereInput;
    orderBy?: Prisma.Unicode_Emoji_VersionOrderByWithRelationInput;
  }): Promise<Unicode_Emoji_Version[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.unicode_Emoji_Version.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async listAll(params: {
    where?: Prisma.Unicode_Emoji_VersionWhereInput;
    orderBy?: Prisma.Unicode_Emoji_VersionOrderByWithRelationInput;
  }): Promise<Unicode_Emoji_Version[]> {
    const { where, orderBy } = params;

    return this.prisma.unicode_Emoji_Version.findMany({
      where,
      orderBy,
      include: {
        _count: {
          select: {
            Unicode_Emoji: true,
          },
        },
        Unicode_Emoji: {
          select: {
            emoji: true,
          },
          where: {
            isSupportingByChromium: true,
          },
        },
      },
    });
  }

  async create(
    data: Prisma.Unicode_Emoji_VersionCreateInput,
  ): Promise<Unicode_Emoji_Version> {
    const hasRecord = await this.prisma.unicode_Emoji_Version.findFirst({
      where: {
        tag: data.tag,
      },
    });

    if (hasRecord) {
      return hasRecord;
    }

    return this.prisma.unicode_Emoji_Version.create({
      data,
    });
  }

  async update(params: {
    where: Prisma.Unicode_Emoji_VersionWhereUniqueInput;
    data: Prisma.Unicode_Emoji_VersionUpdateInput;
  }): Promise<Unicode_Emoji_Version> {
    const { where, data } = params;
    return this.prisma.unicode_Emoji_Version.update({
      data,
      where,
    });
  }

  async delete(
    where: Prisma.Unicode_Emoji_VersionWhereUniqueInput,
  ): Promise<Unicode_Emoji_Version> {
    return this.prisma.unicode_Emoji_Version.delete({
      where,
    });
  }
}
