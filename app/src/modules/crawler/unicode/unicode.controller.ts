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
            const versionCreateJob = results.map(
              async (item: Prisma.Unicode_Emoji_VersionCreateInput) => {
                await this.versionService.create(item);
              },
            );

            return zip(versionCreateJob).subscribe({
              complete: async () => {
                const versions: Unicode_Emoji_Version[] = (
                  await this.versionService.listAll({
                    orderBy: {
                      tag: 'asc',
                    },
                  })
                ).sort((a, b) => parseFloat(a.tag) - parseFloat(b.tag));

                resolve(of(this.getEmojiVersionListHtml(versions)));
              },
            });
          }),
        )
        .subscribe(() => {
          ray('subscribe');
        });
    });
  }

  @Get('version/:version')
  public async getEmojisByVersion(
    @Param('version') version: string,
  ): Promise<Observable<any>> {
    return new Promise(async (resolve) => {
      const cacheKey = 'has:unicode:emoji:list:of-v' + version,
        cachedData = await this.cacheManager.get(cacheKey),
        versionData: Unicode_Emoji_Version = await this.versionService.findOne({
          tag: version,
        });

      if (cachedData) {
        const responseData = this.getEmojiListofVersionHtml(versionData);

        return resolve(of(responseData));
      }

      return await this.httpService
        .get(`https://emojipedia.org/unicode-${version}/`)
        .pipe(
          map(async (res) => {
            const parsedHtml = parse(res.data);

            const unicodeEmojiItems = parsedHtml.querySelectorAll(
              'div.content>article>ul:nth-child(3) li>a',
            );

            let unicodeEmojiList = null;

            if (unicodeEmojiItems && unicodeEmojiItems) {
              // fix protocol issue: https://github.com/puppeteer/puppeteer/issues/1175
              const browser = await puppeteer.launch({
                args: ['--disable-dev-shm-usage', '--shm-size=3gb'],
              });
              this.puppeeterPage = await browser.newPage();

              unicodeEmojiList = unicodeEmojiItems
                .map((element: HTMLElement) => {
                  if (element.attributes && element.attributes.href) {
                    const versionData = element.innerText.split(' ');

                    const item = {
                      emoji: versionData[0]?.trim() || null,
                      emojipedia_page: element.attributes.href.replace(
                        /\//g,
                        '',
                      ),
                    };

                    return item;
                  }
                })
                .filter((x) => Boolean(x.emoji));

              const chromiumVersion: string = await this.puppeeterPage
                .browser()
                .version();

              for (let i = 0; i < unicodeEmojiList.length; i++) {
                const item = unicodeEmojiList[i];

                unicodeEmojiList[i].isSupportingByChromium =
                  await this.checkEmojisIsSupported(item);
                unicodeEmojiList[i].testedChromiumVersion = chromiumVersion;
              }

              await browser.close();

              const array = unicodeEmojiList.map(
                async (item: Prisma.Unicode_EmojiCreateInput) => {
                  await this.unicodeService.create(<
                    Prisma.Unicode_EmojiCreateInput
                  >{
                    emoji: item.emoji,
                    versionId: versionData.id,
                    isSupportingByChromium: item.isSupportingByChromium,
                    testedChromiumVersion: item.testedChromiumVersion,
                    emojipedia_page: item.emojipedia_page,
                  });
                },
              );

              return zip(array).subscribe({
                complete: async () => {
                  await this.cacheManager.set(
                    cacheKey,
                    {
                      isDataCrawled: true,
                    },
                    {
                      ttl: 1000 * 60 * 300,
                    },
                  );

                  resolve(
                    of(
                      '<meta http-equiv="refresh" content="0; url=/crawler/unicode/version/' +
                        version +
                        '">',
                    ),
                  );
                },
              });
            }
          }),
          catchError((error) =>
            of({ message: error.message, status: error.status }),
          ),
        )
        .toPromise();
    });
  }

  /**
   * Check given emoji is supporting by headless chromium
   *
   * @param item
   * @returns Promise<boolean>
   */
  private async checkEmojisIsSupported(item: any): Promise<boolean> {
    // this part is to check if the given emoji is supported by chromium or not
    // source code: https://github.com/koala-interactive/is-emoji-supported
    // umd source: https://egoistdeveloper.github.io/npm-explorer/?p=is-emoji-supported@0.0.5/dist/cjs/is-emoji-supported.js&selection=13:18-13:18

    return await this.puppeeterPage.evaluate((emoji: any) => {
      return new Promise((resolve, reject) => {
        try {
          var cache = new Map();

          function isEmojiSupported(unicode) {
            if (cache.has(unicode)) {
              return cache.get(unicode);
            }

            var supported = isSupported(unicode);

            cache.set(unicode, supported);

            resolve(supported);
            // return supported;
          }

          var isSupported = (function () {
            var ctx = null;

            try {
              ctx = document.createElement('canvas').getContext('2d');
            } catch (_a) {}

            // Not in browser env
            if (!ctx) {
              return function () {
                return false;
              };
            }

            var CANVAS_HEIGHT = 25,
              CANVAS_WIDTH = 20,
              textSize = Math.floor(CANVAS_HEIGHT / 2);

            // Initialize convas context
            ctx.font = textSize + 'px Arial, Sans-Serif';
            ctx.textBaseline = 'top';
            ctx.canvas.width = CANVAS_WIDTH * 2;
            ctx.canvas.height = CANVAS_HEIGHT;

            return function (unicode) {
              ctx.clearRect(0, 0, CANVAS_WIDTH * 2, CANVAS_HEIGHT);
              // Draw in red on the left
              ctx.fillStyle = '#FF0000';
              ctx.fillText(unicode, 0, 22);

              // Draw in blue on right
              ctx.fillStyle = '#0000FF';
              ctx.fillText(unicode, CANVAS_WIDTH, 22);

              var a = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;

              var count = a.length,
                i = 0;

              // Search the first visible pixel
              for (; i < count && !a[i + 3]; i += 4);

              // No visible pixel
              if (i >= count) {
                return false;
              }

              // Emoji has immutable color, so we check the color of the emoji in two different colors
              // the result show be the same.
              var x = CANVAS_WIDTH + ((i / 4) % CANVAS_WIDTH),
                y = Math.floor(i / 4 / CANVAS_WIDTH),
                b = ctx.getImageData(x, y, 1, 1).data;

              if (a[i] !== b[0] || a[i + 2] !== b[2]) {
                return false;
              }

              // Some emojis are a contraction of different ones, so if it's not
              // supported, it will show multiple characters
              if (ctx.measureText(unicode).width >= CANVAS_WIDTH) {
                return false;
              }

              // Supported
              return true;
            };
          })();

          return isEmojiSupported(emoji);
        } catch (error) {
          reject(error);
        }
      }).catch((error) => {
        console.error(error); // add catch here
      });
    }, item.emoji);
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

  private async getEmojiListofVersionHtml(versionData: any) {
    const emojis: Unicode_Emoji[] = await this.unicodeService.listAll({
      where: {
        Unicode_Emoji_Version: versionData,
      },
    });

    return (
      '<a href="../versions">Return Back</a>' +
      `<h3>Unicode Emojis for v${versionData.tag} (${emojis.length})</h3>  <div style="font-size: 40px; display: flex; flex-wrap: wrap;">` +
      emojis
        .map(
          (item: any) =>
            `<a href="../emoji/${
              item.emojipedia_page
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
              item.emojipedia_page
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
