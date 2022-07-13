/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Controller, Get, Inject, Param } from '@nestjs/common';
import { map, Observable, of, zip } from 'rxjs';
import { UnicodeService } from './unicode.service';
import { UnicodeVersionService } from './version/unicode-version.service';
import {
  Prisma,
  Unicode_Emoji,
  Unicode_Emoji_Version,
  Unicode_Version,
} from '@prisma/client';
import { Cache } from 'cache-manager';
import { CrawlerService } from './crawler/crawler.service';
import { EmojiVersionService } from './version/emoji-version.service';
import { ray } from 'node-ray';

@Controller('unicode-emoji')
export class UnicodeController {
  private puppeeterPage: any;

  constructor(
    private readonly httpService: HttpService,
    private readonly unicodeService: UnicodeService,
    private readonly unicodeVersionService: UnicodeVersionService,
    private readonly emojiVersionService: EmojiVersionService,
    private readonly crawlerService: CrawlerService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Get live unicode emoji version list from emojipedia.org
   *
   * @returns Promise<Observable<any>>
   */
  @Get('versions')
  public async getVersions(): Promise<Observable<any>> {
    return await new Promise(async (resolve) => {
      const emojiVersions = (
        await this.crawlerService.crawlEmojiVersions()
      ).pipe(
        map(async (results) => {
          const versionCreateJobs = results.map(
            async (item: Prisma.Unicode_Emoji_VersionCreateInput) => {
              await this.emojiVersionService.create(item);
            },
          );

          return zip(versionCreateJobs).subscribe({
            complete: async () => {
              console.log('version fetch done');
            },
          });
        }),
      );

      const unicodeVersions = (
        await this.crawlerService.crawlUnicodeVersions()
      ).pipe(
        map(async (results) => {
          const versionCreateJobs = results.map(
            async (item: Prisma.Unicode_VersionCreateInput) => {
              await this.unicodeVersionService.create(item);
            },
          );

          return zip(versionCreateJobs).subscribe({
            complete: async () => {
              console.log('version fetch successful');
            },
          });
        }),
      );

      return zip(emojiVersions, unicodeVersions).subscribe({
        complete: async () => {
          const emojiVersions: Unicode_Emoji_Version[] = (
            await this.emojiVersionService.listAll({
              orderBy: {
                tag: 'asc',
              },
            })
          ).sort((a, b) => parseFloat(a.tag) - parseFloat(b.tag));

          const unicodeVersions: Unicode_Version[] = (
            await this.unicodeVersionService.listAll({
              orderBy: {
                tag: 'asc',
              },
            })
          ).sort((a, b) => parseFloat(a.tag) - parseFloat(b.tag));

          resolve(
            of(
              (await this.getEmojiVersionListHtml(emojiVersions, 'emoji')) +
                (await this.getEmojiVersionListHtml(
                  unicodeVersions,
                  'unicode',
                )),
            ),
          );
        },
      });
    });
  }

  /**
   * Get emoji list of target version
   *
   * @param versionTag string
   * @returns Promise<Observable<any>>
   */
  @Get('version/:type/:version')
  public async getEmojisByVersion(
    @Param('type') type: string,
    @Param('version') versionTag: string,
  ): Promise<Observable<any>> {
    const unicodeVersion: Unicode_Version =
      type === 'unicode' &&
      (await this.unicodeVersionService.findOne({
        tag: versionTag,
      }));

    const emojiVersion: Unicode_Emoji_Version =
      type === 'emoji' &&
      (await this.emojiVersionService.findOne({
        tag: versionTag,
      }));

    const version = (type === 'emoji' && emojiVersion) || unicodeVersion;

    return await new Promise(async (resolve) => {
      if (!version) {
        resolve(of(`<h3>Given version not found</h3>`));
      }

      return (await this.crawlerService.crawlEmojiListByVersion(type, version))
        .pipe(
          map(async (results) => {
            const emojiCreateJobs = results.map(
              async (item: Prisma.Unicode_EmojiCreateInput) => {
                try {
                  const hasEmoji = await this.unicodeService.findOne({
                    slug: item.slug,
                  });

                  if (hasEmoji) {
                    if (
                      type === 'unicode' &&
                      !hasEmoji.unicode_VersionId &&
                      hasEmoji.unicode_VersionId !== unicodeVersion.id
                    ) {
                      hasEmoji.unicode_VersionId =
                        unicodeVersion?.id || hasEmoji.unicode_VersionId;
                    }

                    if (
                      type === 'emoji' &&
                      !hasEmoji.unicode_Emoji_VersionId &&
                      emojiVersion &&
                      hasEmoji.unicode_Emoji_VersionId !== emojiVersion.id
                    ) {
                      hasEmoji.unicode_Emoji_VersionId =
                        emojiVersion?.id || hasEmoji.unicode_Emoji_VersionId;
                    }

                    await this.unicodeService.update(<any>{
                      where: {
                        id: hasEmoji.id,
                      },
                      data: {
                        ...hasEmoji,
                      },
                    });
                  } else {
                    await this.unicodeService.create(<any>{
                      ...item,
                      ...{
                        unicode_VersionId: unicodeVersion?.id,
                        unicode_Emoji_VersionId: emojiVersion?.id,
                      },
                    });
                  }
                } catch (error) {
                  // TODO: fix "Timed out during query execution." error
                  console.log(error);
                }
              },
            );

            return zip(emojiCreateJobs).subscribe({
              complete: async () => {
                let emojis: Unicode_Emoji[];

                if (type === 'unicode') {
                  emojis = await this.unicodeService.listAll({
                    where: {
                      unicode_VersionId: version.id,
                    },
                  });
                } else if (emojiVersion) {
                  emojis = await this.unicodeService.listAll({
                    where: {
                      unicode_Emoji_VersionId: version.id,
                    },
                  });
                }

                resolve(
                  of(this.getEmojiListofVersionHtml(version, emojis, type)),
                );
                // resolve(of(emojis));
              },
            });
          }),
        )
        .subscribe(() => {
          console.log(`${type}s of target version fetch successful`);
        });
    });
  }

  /**
   * Get live unicode emoji details
   *
   * @returns Promise<Observable<any>>
   */
  @Get('emoji/:slug')
  public async getEmojiDetails(
    @Param('slug') slug: string,
  ): Promise<Observable<any>> {
    const emoji: Unicode_Emoji = await this.unicodeService.findOne({
      slug: slug,
    });

    return await new Promise(async (resolve) => {
      if (!slug) {
        resolve(of(`<h3>Given emoji not found</h3>`));
      }

      return (await this.crawlerService.crawlEmojiDetails(emoji))
        .pipe(
          map(async (results) => {
            resolve(of(results));

            // const versionCreateJobs = results.map(
            //   async (item: Prisma.Unicode_Emoji_VersionCreateInput) => {
            //     await this.versionService.create(item);
            //   },
            // );

            // return zip(versionCreateJobs).subscribe({
            //   complete: async () => {
            //     const versions: Unicode_Emoji_Version[] = (
            //       await this.versionService.listAll({
            //         orderBy: {
            //           tag: 'asc',
            //         },
            //       })
            //     ).sort((a, b) => parseFloat(a.tag) - parseFloat(b.tag));

            //     resolve(of(this.getEmojiVersionListHtml(versions)));
            //     resolve(of(versions));
            //   },
            // });
          }),
        )
        .subscribe(() => {
          console.log(`${emoji.emoji} details fetch successful`);
        });
    });
  }

  /**
   * Spaghetti UI for crawling unicode emoji
   *
   * @param versions list of version
   * @returns string
   */
  private async getEmojiVersionListHtml(
    versions: any,
    type: string,
  ): Promise<string> {
    const versionsList = versions
      .filter((x) => x._count.Unicode_Emoji === 0)
      .map((item) => {
        return `await fetch('http://localhost:3000/crawler/unicode-emoji/version/${type}/${item.tag}');
        await new Promise(resolve => setTimeout(resolve, 2500));`;
      })
      .join('');

    return (
      `<h3>Crawled Unicode Emoji Versions (${versions.length})</h3>  <ul>` +
      versions
        .map(
          (version: any) =>
            `<li style="padding: 5px;">
              <a href="version/${type}/${version.tag}">
                v${version.tag} (${version._count.Unicode_Emoji})
              </a>

              ----

              <a href="https://emojipedia.org/${type}-${version.tag}/" target="_blank">
                emojipedia.org
              </a>
            </li>`,
        )
        .join('') +
      '</ul>' +
      (await this.getEmojiListofAllHtml(type)) +
      `<script>
        setTimeout(() => {
          (async () => {
           ${versionsList}
          })();
        }, 5000);
      </script>`
    );
  }

  private async getEmojiListofVersionHtml(
    version: any,
    emojis: any,
    type: string,
  ) {
    return (
      '<a href="/crawler/unicode-emoji/versions">Return Back</a>' +
      `<h3>${type} Emojis for v${version.tag} (${emojis.length})</h3>  <div style="font-size: 40px; display: flex; flex-wrap: wrap;">` +
      emojis
        .map(
          (item: any) =>
            `<a href="/crawler/unicode-emoji/emoji/${
              item.slug
            }" style="margin: 10px; border: 1px solid gray; padding: 10px;" ${
              item.isSupportingByChromium
                ? ''
                : 'title="possibly unsupported emoji"'
            }>${item.emoji} ${item.isSupportingByChromium ? '' : '❌'}</a>`,
        )
        .join('') +
      '</div>'
    );
  }

  private async getEmojiListofAllHtml(type: string) {
    const emojis: Unicode_Emoji[] =
      type === 'emoji'
        ? await this.unicodeService.listAll({
            where: {
              isSupportingByChromium: true,
              NOT: [
                {
                  unicode_Emoji_VersionId: null,
                },
              ],
            },
            orderBy: {
              emoji: 'desc',
            },
          })
        : await this.unicodeService.listAll({
            where: {
              isSupportingByChromium: true,
              NOT: [
                {
                  unicode_VersionId: null,
                },
              ],
            },
            orderBy: {
              emoji: 'desc',
            },
          });

    const unsupportedEmojis =
      type === 'emoji'
        ? await this.unicodeService.listAll({
            where: {
              isSupportingByChromium: false,
              NOT: [
                {
                  unicode_Emoji_VersionId: null,
                },
              ],
            },
          })
        : await this.unicodeService.listAll({
            where: {
              isSupportingByChromium: false,
              NOT: [
                {
                  unicode_VersionId: null,
                },
              ],
            },
          });

    return (
      '<a href="/crawler/unicode-emoji/versions">Return Back</a>' +
      `<h3>Supported Unicode Emojis (supported: ${emojis.length} / unsupported: ${unsupportedEmojis.length})</h3>  
      <div style="font-size: 40px; display: flex; flex-wrap: wrap; height: 600px; overflow: auto;">` +
      emojis
        .map(
          (item: any) =>
            `<a href="/crawler/unicode-emoji/emoji/${
              item.slug
            }" style="margin: 10px; border: 1px solid gray; padding: 10px;" ${
              item.isSupportingByChromium
                ? ''
                : 'title="possibly unsupported emoji"'
            }>${item.emoji} ${item.isSupportingByChromium ? '' : '❌'}</a>`,
        )
        .join('') +
      '</div>'
    );
  }
}
