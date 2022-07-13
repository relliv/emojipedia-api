import { CacheContainer } from 'node-ts-cache';
import { NodeFsStorage } from 'node-ts-cache-storage-node-fs';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { HTMLElement, parse } from 'node-html-parser';
import { catchError, map, Observable, of, zip } from 'rxjs';
import { Prisma, Unicode_Emoji, Unicode_Emoji_Version } from '@prisma/client';
import puppeteer from 'puppeteer';
import { ray } from 'node-ray';

@Injectable()
export class CrawlerService {
  private cacheContainer: CacheContainer;
  private puppeeterPage: any;
  private cacheTtl = 60 * 60 * 100;

  constructor(private readonly httpService: HttpService) {
    this.cacheContainer = new CacheContainer(
      new NodeFsStorage('/storage/cache/'),
    );
  }

  public async crawlEmojiVersions(): Promise<Observable<any>> {
    return new Promise(async (resolve) => {
      const cacheKey = 'unicode:emoji:versions',
        cachedData = await this.cacheContainer.getItem(cacheKey);

      if (cachedData) {
        return resolve(of(cachedData));
      }

      return await this.httpService
        .get('https://emojipedia.org/')
        .pipe(
          map(async (res) => {
            const parsedHtml = parse(res.data),
              versionItems = parsedHtml.querySelectorAll(
                "footer .unicode-version ul li a[href^='/emoji-']",
              );

            if (versionItems && versionItems.length > 0) {
              const results = versionItems
                .map((element: HTMLElement) => {
                  if (element.attributes && element.attributes.href) {
                    if (element.attributes.href.startsWith('/emoji-')) {
                      const versionData = element.innerText.split('Emoji ');

                      const item = <Prisma.Unicode_Emoji_VersionCreateInput>{
                        tag: versionData[1] || 0,
                      };

                      return item;
                    }
                  }
                })
                .filter((x) => x.tag);

              if (results) {
                this.cacheContainer.setItem(cacheKey, results, {
                  ttl: this.cacheTtl,
                });
              }

              resolve(of(results ? results : []));
            }

            resolve(of([]));
          }),
          catchError((error: any) => {
            resolve(of([]));

            console.log(error.message);

            return of(error.message);
          }),
        )
        .toPromise();
    });
  }

  public async crawlUnicodeVersions(): Promise<Observable<any>> {
    return new Promise(async (resolve) => {
      const cacheKey = 'unicode:versions',
        cachedData = await this.cacheContainer.getItem(cacheKey);

      if (cachedData) {
        return resolve(of(cachedData));
      }

      return await this.httpService
        .get('https://emojipedia.org/')
        .pipe(
          map(async (res) => {
            const parsedHtml = parse(res.data),
              versionItems = parsedHtml.querySelectorAll(
                "footer .unicode-version ul li a[href^='/unicode-']",
              );

            if (versionItems && versionItems.length > 0) {
              const results = versionItems
                .map((element: HTMLElement) => {
                  if (element.attributes && element.attributes.href) {
                    if (element.attributes.href.startsWith('/unicode-')) {
                      const versionData = element.innerText.split('Unicode ');

                      const item = <Prisma.Unicode_VersionCreateInput>{
                        tag: versionData[1] || 0,
                      };

                      return item;
                    }
                  }
                })
                .filter((x) => x.tag);

              if (results) {
                this.cacheContainer.setItem(cacheKey, results, {
                  ttl: this.cacheTtl,
                });
              }

              resolve(of(results ? results : []));
            }

            resolve(of([]));
          }),
          catchError((error: any) => {
            resolve(of([]));

            console.log(error.message);

            return of(error.message);
          }),
        )
        .toPromise();
    });
  }

  public async crawlEmojiListByVersion(
    type: string,
    version: Unicode_Emoji_Version,
  ): Promise<Observable<any>> {
    return new Promise(async (resolve) => {
      const cacheKey = `unicode:emoji:type-${type}:v-${version.tag}`,
        cachedData = await this.cacheContainer.getItem(cacheKey);

      if (cachedData) {
        return resolve(of(cachedData));
      }

      return await this.httpService
        .get(`https://emojipedia.org/${type}-${version.tag}/`)
        .pipe(
          map(async (res) => {
            const parsedHtml = parse(res.data),
              unicodeEmojiItems = parsedHtml.querySelectorAll(
                'div.content>article>ul:nth-child(3) li>a, div.content>article>ul:nth-child(4) li>a',
              );

            if (unicodeEmojiItems && unicodeEmojiItems.length > 0) {
              // fix protocol issue: https://github.com/puppeteer/puppeteer/issues/1175
              const browser = await puppeteer.launch({
                args: ['--disable-dev-shm-usage', '--shm-size=3gb'],
              });

              this.puppeeterPage = await browser.newPage();

              const chromiumVersion: string = await this.puppeeterPage
                .browser()
                .version();

              const results = unicodeEmojiItems
                .map((element: HTMLElement) => {
                  if (element.attributes && element.attributes.href) {
                    const emojiData = element.innerText.split(' '),
                      emoji = emojiData[0]?.trim();

                    let item: any = null;

                    if (Boolean(emoji)) {
                      // source: https://stackoverflow.com/a/64007175/6940144
                      // note: https://stackoverflow.com/a/64396666/6940144
                      const regex = /\p{Extended_Pictographic}/gu,
                        isEmojiValid = regex.test(emoji);

                      if (isEmojiValid) {
                        item = {
                          emoji: emoji,
                          testedChromiumVersion: chromiumVersion,
                          slug: element.attributes.href.replace(/\//g, ''),
                        };
                      }
                    }

                    return item;
                  }
                })
                .filter((x) => x && Boolean(x.emoji));

              for (let i = 0; i < results.length; i++) {
                results[i].isSupportingByChromium = await this.isEmojiSupported(
                  results[i].emoji,
                );
              }

              this.cacheContainer.setItem(cacheKey, results, {
                ttl: this.cacheTtl,
              });

              resolve(of(results ? results : []));
            }

            resolve(of([]));
          }),
          catchError((error: any) => {
            resolve(of([]));

            console.log(error.message);

            return of(error.message);
          }),
        )
        .toPromise();
    });
  }

  public async crawlEmojiDetails(
    emoji: Unicode_Emoji,
  ): Promise<Observable<any>> {
    return new Promise(async (resolve) => {
      const cacheKey = `unicode:emoji:details:${emoji.slug}`,
        cachedData = await this.cacheContainer.getItem(cacheKey);

      if (cachedData) {
        return resolve(of(cachedData));
      }

      return await this.httpService
        .get(`https://emojipedia.org/${emoji.slug}`)
        .pipe(
          map(async (res) => {
            const parsedHtml = parse(res.data),
              codepoints = parsedHtml.querySelectorAll(
                "ul li a[href^='/emoji/']:not([title])",
              );

            if (codepoints && codepoints.length > 0) {
              const results = codepoints
                .map((element: HTMLElement) => {
                  if (element.attributes && element.attributes.href) {
                    if (element.attributes.href.startsWith('/emoji/')) {
                      const codepointData = element.innerText.split(' ');

                      return <Prisma.Unicode_EmojiCreateInput>{
                        codePoint: codepointData[1] || 0,
                      };
                    }
                  }
                })
                .filter((x) => x && x.codePoint);

              //   this.cacheContainer.setItem(cacheKey, results, {
              //     ttl: this.cacheTtl,
              //   });

              const result = {
                codepoints: results,
              };

              resolve(of(result ? result : {}));
            }

            resolve(of({}));
          }),
          catchError((error: any) => {
            resolve(of([]));

            console.log(error.message);

            return of(error.message);
          }),
        )
        .toPromise();
    });
  }

  /**
   * Check given emoji is supporting by headless chromium
   *
   * @param emoji string
   * @returns Promise<boolean>
   */
  private async isEmojiSupported(emoji: string): Promise<boolean> {
    // this part is to check if the given emoji is supported by chromium or not
    // source code: https://github.com/koala-interactive/is-emoji-supported
    // umd source: https://egoistdeveloper.github.io/npm-explorer/?p=is-emoji-supported@0.0.5/dist/cjs/is-emoji-supported.js&selection=13:18-13:18

    return await this.puppeeterPage.evaluate((emoji: any) => {
      return new Promise((resolve, reject) => {
        try {
          const cache = new Map();

          function isEmojiSupported(unicode) {
            if (cache.has(unicode)) {
              return cache.get(unicode);
            }

            const supported = isSupported(unicode);

            cache.set(unicode, supported);

            resolve(supported);
            // return supported;
          }

          const isSupported = (function () {
            let ctx = null;

            try {
              ctx = document.createElement('canvas').getContext('2d');
            } catch (_a) {}

            // Not in browser env
            if (!ctx) {
              return function () {
                return false;
              };
            }

            const CANVAS_HEIGHT = 25,
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

              const a = ctx.getImageData(
                0,
                0,
                CANVAS_WIDTH,
                CANVAS_HEIGHT,
              ).data;

              const count = a.length;

              let i = 0;

              // Search the first visible pixel
              for (; i < count && !a[i + 3]; i += 4);

              // No visible pixel
              if (i >= count) {
                return false;
              }

              // Emoji has immutable color, so we check the color of the emoji in two different colors
              // the result show be the same.
              const x = CANVAS_WIDTH + ((i / 4) % CANVAS_WIDTH),
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
    }, emoji);
  }
}
