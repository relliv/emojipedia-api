/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Controller, Get, Inject, Param } from '@nestjs/common';
import { HTMLElement, parse } from 'node-html-parser';
import { ray } from 'node-ray';
import { catchError, map, Observable, of, zip } from 'rxjs';
import puppeteer from 'puppeteer';
import { UnicodeService } from './unicode.service';
import { VersionService } from './version/version.service';
import { Prisma, Unicode_Emoji, Unicode_Emoji_Version } from '@prisma/client';
import { Cache } from 'cache-manager';
import { CrawlerService } from './crawler/crawler.service';

@Controller('unicode')
export class UnicodeController {
  private puppeeterPage: any;

  constructor(
    private readonly httpService: HttpService,
    private readonly unicodeService: UnicodeService,
    private readonly versionService: VersionService,
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
      return (await this.crawlerService.crawlVersions())
        .pipe(
          map(async (results) => {
            const versionCreateJobs = results.map(
              async (item: Prisma.Unicode_Emoji_VersionCreateInput) => {
                await this.versionService.create(item);
              },
            );

            return zip(versionCreateJobs).subscribe({
              complete: async () => {
                const versions: Unicode_Emoji_Version[] = (
                  await this.versionService.listAll({
                    orderBy: {
                      tag: 'asc',
                    },
                  })
                ).sort((a, b) => parseFloat(a.tag) - parseFloat(b.tag));

                resolve(of(this.getEmojiVersionListHtml(versions)));
                resolve(of(versions));
              },
            });
          }),
        )
        .subscribe(() => {
          console.log('version fetch successful');
        });
    });
  }

  /**
   * Get emoji list of target version
   *
   * @param versionTag string
   * @returns Promise<Observable<any>>
   */
  @Get('version/:version')
  public async getEmojisByVersion(
    @Param('version') versionTag: string,
  ): Promise<Observable<any>> {
    const version: Unicode_Emoji_Version = await this.versionService.findOne({
      tag: versionTag,
    });

    return await new Promise(async (resolve) => {
      return (await this.crawlerService.crawlEmojiListByVersion(version))
        .pipe(
          map(async (results) => {
            const emojiCreateJobs = results.map(
              async (item: Prisma.Unicode_EmojiCreateInput) => {
                try {
                  await this.unicodeService.create(<any>{
                    ...item,
                    ...{
                      versionId: version.id,
                    },
                  });
                } catch (error) {
                  // TODO: fix "Timed out during query execution." error
                  console.log(error);
                }
              },
            );

            return zip(emojiCreateJobs).subscribe({
              complete: async () => {
                const emojis: Unicode_Emoji[] =
                  await this.unicodeService.listAll({
                    where: {
                      versionId: version.id,
                    },
                  });

                resolve(of(this.getEmojiListofVersionHtml(version, emojis)));
                resolve(of(emojis));
              },
            });
          }),
        )
        .subscribe(() => {
          console.log('emojis of target version fetch successful');
        });
    });
  }

  /**
   * Spaghetti UI for crawling unicode emoji
   *
   * @param versions list of version
   * @returns string
   */
  private async getEmojiVersionListHtml(versions: any) {
    const versionsList = versions
      .filter(
        (x: any) =>
          x._count.Unicode_Emoji === 0 &&
          (x.tag != '3.1' || x.tag != '5.0' || x.tag != '16.0'), // exclude empty versions
      )
      .map((item) => {
        return `await fetch('http://localhost:3000/crawler/unicode/version/${item.tag}');
        await new Promise(resolve => setTimeout(resolve, 2000));`;
      })
      .join('');

    return (
      `<h3>Crawled Unicode Emoji Versions (${versions.length})</h3>  <ul>` +
      versions
        .map(
          (version: any) =>
            `<li style="padding: 5px;">
              <a href="version/${version.tag}">
                v${version.tag} (${version._count.Unicode_Emoji})
              </a>

              ----

              <a href="https://emojipedia.org/unicode-${version.tag}/" target="_blank">
                emojipedia.org
              </a>
            </li>`,
        )
        .join('') +
      '</ul>' +
      (await this.getEmojiListofAllHtml()) +
      'Refresh to fetch new emojis' +
      `<script>
        setTimeout(() => {
          (async () => {
            ${versionsList}
          })();
        }, 5000);
      </script>`
    );
  }

  private async getEmojiListofVersionHtml(version: any, emojis: any) {
    return (
      '<a href="../versions">Return Back</a>' +
      `<h3>Unicode Emojis for v${version.tag} (${emojis.length})</h3>  <div style="font-size: 40px; display: flex; flex-wrap: wrap;">` +
      emojis
        .map(
          (item: any) =>
            `<a href="../emoji/${
              item.emojipediaPage
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

  private async getEmojiListofAllHtml() {
    const emojis: Unicode_Emoji[] = await this.unicodeService.listAll({
      where: {
        isSupportingByChromium: true,
      },
      orderBy: {
        emoji: 'desc',
      },
    });

    return (
      '<a href="../versions">Return Back</a>' +
      `<h3>Supported Unicode Emojis (${emojis.length})</h3>  <div style="font-size: 40px; display: flex; flex-wrap: wrap;">` +
      emojis
        .map(
          (item: any) =>
            `<a href="../emoji/${
              item.emojipediaPage
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
