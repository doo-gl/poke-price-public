import {cardCollectionRetriever} from "../card-collection/CardCollectionRetriever";
import moment from "moment/moment";
import JSZip from 'jszip'
import {cardListAliasRetriever} from "../card/seo/alias/CardListAliasRetriever";
import xmlbuilder from "xmlbuilder";
import {batchArray} from "../../tools/ArrayBatcher";
import {ItemEntity, itemRepository} from "../item/ItemEntity";
import {cardCollectionRepository} from "../card-collection/CardCollectionRepository";
import {SortOrder} from "../../database/BaseCrudRepository";
import {appHolder} from "../../infrastructure/AppHolder";

const LASTMOD_DATE_FORMAT = 'YYYY-MM-DD'

interface SitemapFile {
  fileName:string,
  entries:Array<SitemapEntry>
}

interface LanguageLink {
  '@rel':"alternative",
  '@hreflang':string,
  '@href':string,
}

interface SitemapEntry {
  loc:string,
  lastmod:string,
  changefreq?:'always'|'hourly'|'daily'|'weekly'|'monthly'|'yearly'|'never',
  priority?:number,
  'xhtml:link'?:Array<LanguageLink>
}

const generateCollectionEntries = async ():Promise<Array<SitemapEntry>> => {
  const collections = await cardCollectionRetriever.retrieveAllParents();
  return collections.map(collection => ({
    loc: `https://pokeprice.io/collection/${collection.id}`,
    lastmod: moment().format(LASTMOD_DATE_FORMAT),
    changefreq: "weekly",
    priority: 0.7,
  }))
}

const generateAliasEntries = async ():Promise<Array<SitemapEntry>> => {
  const aliases = await cardListAliasRetriever.retrieveAll();
  return aliases.map(alias => ({
    loc: `https://pokeprice.io/card/a/${alias.aliasSlug}`,
    lastmod: moment().format(LASTMOD_DATE_FORMAT),
    changefreq: "weekly",
    priority: 0.8,
  }))
}

// const generatePopularUrlEntries = async ():Promise<Array<SitemapEntry>> => {
//   const cardListViewCounts = await cardQueryViewCountRetriever.retrieveBetweenDates(
//     moment().subtract(2, 'weeks'),
//     moment()
//   )
//   const filteredCounts = cardListViewCounts.filter(count =>
//     !(count.tagKeys.length === 1 && count.tagKeys[0].startsWith('fromId'))
//     && count.tagKeys.length > 0
//   )
//   const keyToViewCounts = new Map<string,number>();
//   filteredCounts.forEach(count => {
//     const key = count.key;
//     const viewCount = keyToViewCounts.get(key) ?? 0;
//     keyToViewCounts.set(key, viewCount + count.count)
//   })
  // const topUrls = [...keyToViewCounts.entries()]
  //   .sort(comparatorBuilder.objectAttributeDESC(value => value[1]))
  //   .slice(0, 200)
  //   .map(entry => {
  //     const key = entry[0];
  //     const tagKeys = key.split('|');
  //     const tags = tagKeys.map(tagKey => tagKey.split('='))
  //     const request:any = {};
  //     tags.forEach(tag => {
  //       const name = tag[0]
  //       const value = tag[1]
  //       if (!name || !value || name.length === 0 || value.length === 0) {
  //         return;
  //       }
  //       request[name] = value.indexOf('&') > -1 ? value.split('&') : value;
  //     })
  //     const canonicalSlug = cardListSlugParserV3.mapToCanonicalSlug(request);
  //     return `https://pokeprice.io/card/q/${canonicalSlug}`
  //   });

  // update sitemap generator to use items
//   const topUrls:Array<string> = [];
//
//   return topUrls.map(topUrl => ({
//     loc: topUrl,
//     lastmod: moment().format(LASTMOD_DATE_FORMAT),
//     priority: 0.75,
//     changefreq: "weekly",
//   }))
// }

const generateCommonEntries = async ():Promise<Array<SitemapEntry>> => {
  return [
    {
      loc: "https://pokeprice.io/item",
      lastmod: moment().format(LASTMOD_DATE_FORMAT),
      changefreq: "weekly",
      priority: 0.5,
    },
    {
      loc: "https://pokeprice.io/collection",
      lastmod: moment().format(LASTMOD_DATE_FORMAT),
      changefreq: "weekly",
      priority: 0.5,
    },
  ]
}

const generate = async ():Promise<object> => {
  const entries:Array<SitemapEntry> = [];
  (await generateCommonEntries()).forEach(entry => {
    entries.push(entry)
  });
  (await generateCollectionEntries()).forEach(entry => {
    entries.push(entry)
  });
  // (await generateAliasEntries()).forEach(entry => {
  //   entries.push(entry)
  // });
  // (await generatePopularUrlEntries()).forEach(entry => {
  //   entries.push(entry)
  // });

  return {
    urlset: {
      '@xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
      url: entries,
    },
  }
}

const generateCommonSitemapFiles = async ():Promise<Array<SitemapFile>> => {
  const entries:Array<SitemapEntry> = [
    {
      loc: "https://pokeprice.io/item",
      lastmod: moment().format(LASTMOD_DATE_FORMAT),
      changefreq: "weekly",
      priority: 0.5,
    },
    {
      loc: "https://pokeprice.io/collection",
      lastmod: moment().format(LASTMOD_DATE_FORMAT),
      changefreq: "weekly",
      priority: 0.5,
    },
    {
      loc: "https://pokeprice.io/marketplace",
      lastmod: moment().format(LASTMOD_DATE_FORMAT),
      changefreq: "weekly",
      priority: 0.5,
    },
    {
      loc: "https://pokeprice.io/portfolio",
      lastmod: moment().format(LASTMOD_DATE_FORMAT),
      changefreq: "weekly",
      priority: 0.5,
    },
    {
      loc: "https://pokeprice.io/directory",
      lastmod: moment().format(LASTMOD_DATE_FORMAT),
      changefreq: "weekly",
      priority: 0.5,
    },
  ]
  return [{
    fileName: `sitemap_common.xml`,
    entries,
  }]
}

const generateItemDetailSitemapFiles = async ():Promise<Array<SitemapFile>> => {
  const itemsToPutInSitemap = new Array<ItemEntity>()

  await itemRepository.iterator()
    .options({sort: {'sort.ukPrice': -1}})
    .iterate(async item => {
      if (!item.visible) {
        return false
      }
      if (itemsToPutInSitemap.length >= 2000) {
        return true
      }
      itemsToPutInSitemap.push(item)
      return false
    })
  const entries:Array<SitemapEntry> = itemsToPutInSitemap.map(item => {
    const identifier = item.slug ?? item._id.toString()
    return {
      loc: `https://pokeprice.io/item/${identifier}`,
      lastmod: moment().format(LASTMOD_DATE_FORMAT),
      priority: 0.75,
      changefreq: "weekly",
      "xhtml:link": [
        {"@rel":"alternative", "@hreflang": "en-gb", "@href": `https://pokeprice.io/locale/en-gb/item/${identifier}`},
        {"@rel":"alternative", "@hreflang": "en-us", "@href": `https://pokeprice.io/locale/en-us/item/${identifier}`},
      ],
    }
  })
  const batchedEntries = batchArray(entries, 40000)
  return batchedEntries.map((entryBatch:Array<SitemapEntry>, index:number) => ({
    fileName: `sitemap_items_${index}.xml`,
    entries: entryBatch,
  }))
}

const generateCollectionSitemapFiles = async ():Promise<Array<SitemapFile>> => {
  const entries:Array<SitemapEntry> = []
  await cardCollectionRepository.iterator()
    .sort([{field: "dateCreated", order: SortOrder.ASC}])
    .iterate(async collection => {
      const identifier = collection.id
      entries.push({
        loc: `https://pokeprice.io/collection/${identifier}`,
        lastmod: moment().format(LASTMOD_DATE_FORMAT),
        priority: 0.8,
        changefreq: "weekly",
      })
    })
  const batchedEntries = batchArray(entries, 40000)
  return batchedEntries.map((entryBatch:Array<SitemapEntry>, index:number) => ({
    fileName: `sitemap_collections_${index}.xml`,
    entries: entryBatch,
  }))
}



const toSitemapContent = (entries:Array<SitemapEntry>):string => {
  const sitemapObject = {
    urlset: {
      '@xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
      '@xmlns:xhtml': 'http://www.w3.org/1999/xhtml',
      url: entries,
    },
  }
  return xmlbuilder.create(sitemapObject).end()
}

const toSitemapIndexContent = (fileNames:Array<string>):string => {
  const sitemapObject = {
    sitemapindex: {
      '@xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
      '@xmlns:xhtml': 'http://www.w3.org/1999/xhtml',
      sitemap: fileNames.map(fileName => ({
        loc: `https://pokeprice.io/${fileName}`,
        lastmod: moment().format(LASTMOD_DATE_FORMAT),
      })),
    },
  }
  return xmlbuilder.create(sitemapObject).end()
}

const generateIndexZip = (files:Array<SitemapFile>):Promise<Buffer> => {
  const zip = new JSZip()
  const fileNames = files.map(file => file.fileName)
  files.forEach(file => zip.file(file.fileName, toSitemapContent(file.entries)))
  zip.file('sitemap.xml', toSitemapIndexContent(fileNames))
  return zip.generateAsync({type:"nodebuffer"})
}

const generateIndex = async ():Promise<Buffer> => {
  const files:Array<SitemapFile> = new Array<SitemapFile>()
    .concat(await generateCommonSitemapFiles())
    .concat(await generateItemDetailSitemapFiles())
    .concat(await generateCollectionSitemapFiles())

  return generateIndexZip(files)
}

const uploadIndexToBucket = async () => {
  const zip = await generateIndex()
  const storage = appHolder.getAdminApp().storage();
  const bucket = storage.bucket('INSERT_GOOGLE_PROJECT_HERE.appspot.com');
  const fileName = `general/sitemap/sitemap_${moment().format('YYYY_MM_DD__HH_mm')}.zip`
  const file = bucket.file(fileName)
  await file.save(zip, {
    contentType: 'application/zip',
  })
}

export const sitemapGenerator = {
  generate,
  generateIndex,
  uploadIndexToBucket,
}