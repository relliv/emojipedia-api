/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { HttpService } from '@nestjs/axios';
import { Controller, Get, Param } from '@nestjs/common';
import { HTMLElement, Node, NodeType, parse } from 'node-html-parser';
import { ray } from 'node-ray';
import { catchError, map, Observable, of } from 'rxjs';
import puppeteer from 'puppeteer';

@Controller('unicode')
export class UnicodeController {
  private puppeeterPage: any;

  constructor(private readonly httpService: HttpService) {}

  @Get('versions')
  public async getVersions(): Promise<Observable<any>> {
    return await this.httpService.get('https://emojipedia.org/').pipe(
      map((res) => {
        const parsedHtml = parse(res.data);

        const unicodeVersionItems = parsedHtml.querySelectorAll(
          'div.unicode-version>ul:nth-child(4) li>a',
        );

        let unicodeVersionsList = null;

        if (unicodeVersionItems && unicodeVersionItems) {
          unicodeVersionsList = unicodeVersionItems
            .map((element: HTMLElement) => {
              if (element.attributes && element.attributes.href) {
                if (element.attributes.href.startsWith('/unicode-')) {
                  const versionData = element.innerText.split('Unicode ');

                  const item = {
                    version: versionData[1] || null,
                  };

                  return item;
                }
              }
            })
            .filter(
              (x) =>
                // x.version && parseFloat(x.version) <= this.maximumEmojiVersion,
                x.version,
            );
        }

        return (
          `<h3>Unicode Emoji Versions (${unicodeVersionsList.length})</h3>  <ul>` +
          unicodeVersionsList
            .map(
              (item: any) =>
                `<li><a href="version/${item.version}">v${item.version}</a></li>`,
            )
            .join('') +
          '</ul>'
        );
      }),
      catchError((error) =>
        of({ message: error.message, status: error.status }),
      ),
    );
  }

  @Get('version/:version')
  public async getEmojisByVersion(
    @Param('version') version: string,
  ): Promise<Observable<any>> {
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
            const browser = await puppeteer.launch();
            this.puppeeterPage = await browser.newPage();

            unicodeEmojiList = unicodeEmojiItems
              .map((element: HTMLElement) => {
                if (element.attributes && element.attributes.href) {
                  const versionData = element.innerText.split(' ');

                  const item = {
                    emoji: versionData[0]?.trim() || null,
                    page: element.attributes.href.replace(/\//g, ''),
                  };

                  return item;
                }
              })
              .filter((x) => x.emoji);

            const chromiumVersion: string = await this.puppeeterPage
              .browser()
              .version();

            for (let i = 0; i < unicodeEmojiList.length; i++) {
              const item = unicodeEmojiList[i];

              unicodeEmojiList[i].isEmojiSupported =
                await this.checkEmojisIsSupported(item);
              unicodeEmojiList[i].chromiumVersion = chromiumVersion;
            }

            await browser.close();
          }

          ray(unicodeEmojiList);

          return (
            '<a href="../versions">Return Back</a>' +
            `<h3>Unicode Emojis for v${version} (${unicodeEmojiList.length})</h3>  <div style="font-size: 40px; display: flex; flex-wrap: wrap;">` +
            unicodeEmojiList
              .map(
                (item: any) =>
                  `<a href="../emoji/${
                    item.page
                  }" style="margin: 10px; border: 1px solid gray; padding: 10px;" ${
                    item.isEmojiSupported
                      ? ''
                      : 'title="possibly unsupported emoji"'
                  }>${item.emoji} ${item.isEmojiSupported ? '' : '❌'}</a>`,
              )
              .join('') +
            '</div>'
          );
        }),
        catchError((error) =>
          of({ message: error.message, status: error.status }),
        ),
      );
  }

  /**
   * Check given emoji is supporting by headless chromium
   *
   * @param item
   * @returns Promise<boolean>
   */
  private async checkEmojisIsSupported(item: any): Promise<boolean> {
    return await this.puppeeterPage.evaluate((emoji: any) => {
      // this part is to check if the given emoji is supported by chromium or not
      // source code: https://github.com/koala-interactive/is-emoji-supported
      // umd source: https://egoistdeveloper.github.io/npm-explorer/?p=is-emoji-supported@0.0.5/dist/cjs/is-emoji-supported.js&selection=13:18-13:18

      var cache = new Map();

      function isEmojiSupported(unicode) {
        if (cache.has(unicode)) {
          return cache.get(unicode);
        }

        var supported = isSupported(unicode);

        cache.set(unicode, supported);

        return supported;
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
    }, item.emoji);
  }
}
