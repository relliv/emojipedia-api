import { CacheContainer } from 'node-ts-cache';
import { NodeFsStorage } from 'node-ts-cache-storage-node-fs';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { HTMLElement, parse } from 'node-html-parser';
import { catchError, map, Observable, of } from 'rxjs';
import { Prisma } from '@prisma/client';

@Injectable()
export class CrawlerService {
  private cacheContainer: CacheContainer;

  constructor(private readonly httpService: HttpService) {
    this.cacheContainer = new CacheContainer(
      new NodeFsStorage('/storage/cache'),
    );
  }

  public async crawlVersions(): Promise<Observable<any>> {
    return new Promise(async (resolve) => {
      const cacheKey = 'has:unicode:emoji:versions',
        cachedData = await this.cacheContainer.getItem(cacheKey);

      if (cachedData) {
        return resolve(of(cachedData));
      }

      return await this.httpService
        .get('https://emojipedia.org/')
        .pipe(
          map(async (res) => {
            const parsedHtml = parse(res.data);

            const unicodeVersionItems = parsedHtml.querySelectorAll(
              'div.unicode-version>ul:nth-child(4) li>a',
            );

            if (unicodeVersionItems && unicodeVersionItems) {
              const results = unicodeVersionItems
                .map((element: HTMLElement) => {
                  if (element.attributes && element.attributes.href) {
                    if (element.attributes.href.startsWith('/unicode-')) {
                      const versionData = element.innerText.split('Unicode ');

                      const item = <Prisma.Unicode_Emoji_VersionCreateInput>{
                        tag: versionData[1] || 0,
                      };

                      return item;
                    }
                  }
                })
                .filter((x) => x.tag);

              this.cacheContainer.setItem(cacheKey, results, {
                ttl: 60 * 60 * 24,
              });

              resolve(of(results ? results : []));
            }
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
}
