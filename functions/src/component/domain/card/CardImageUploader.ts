import axios from "axios";
import {appHolder} from "../../infrastructure/AppHolder";
import {logger} from "firebase-functions";
import {isProduction} from "../../infrastructure/ProductionDecider";
import {ImageDetails, imageOptimizer} from "../../tools/ImageOptimizer";
import {ObjectId} from "mongodb";
import {itemRetriever} from "../item/ItemRetriever";
import {Images, ImageVariant, ItemEntity, itemUpdater} from "../item/ItemEntity";
import {dedupeInOrder} from "../../tools/ArrayDeduper";
import {removeNulls} from "../../tools/ArrayNullRemover";
import {File} from '@google-cloud/storage'

const FALLBACK_CARD_IMAGE_URL = 'INSERT_URL_HERE'

const downloadImage = async (url:string, item:ItemEntity):Promise<Buffer|null> => {

  try {
    logger.info(`Fetching image for card: ${item._id.toString()}, url: ${url}`)
    const response = await axios.get(url, { responseType: "arraybuffer" })
    const rawImageBuffer = Buffer.from(response.data, 'binary');
    logger.info(`Fetched url: ${url}`)
    return rawImageBuffer
  } catch (err:any) {
    logger.error(`Failed to download image at url: ${url}, for card: ${item._id.toString()}, err: ${err.message}`, err.isAxiosError ? {} : err)
    return null
  }
}

const mapVariant = (details:ImageDetails, tags:Array<string>):ImageVariant => {
  const allTags = dedupeInOrder(tags.concat([details.format.toLowerCase()]), t => t)
  return {
    url: details.url,
    size: details.size,
    format: details.format,
    dimensions: { height: details.height, width: details.width },
    tags: allTags,
  }
}

const uploadToStorage = async (item:ItemEntity, url:string, index:number):Promise<Array<ImageVariant>|null> => {
  const rawImageBuffer = await downloadImage(url, item)
  if (!rawImageBuffer) {
    return null
  }
  const app = appHolder.getAdminApp()
  const bucket = app.storage().bucket('INSERT_GOOGLE_PROJECT_HERE.appspot.com')
  const folder = isProduction() ? 'item/image' : 'test/item/image';
  const fullFile:File = bucket.file(`${folder}/${item._id.toString()}--${index}.webp`)
  const smallFile:File = bucket.file(`${folder}/${item._id.toString()}--${index}--small.webp`)
  const tinyFile:File = bucket.file(`${folder}/${item._id.toString()}--${index}--tiny.webp`)
  const normalFile:File = bucket.file(`${folder}/${item._id.toString()}--${index}--fallback-small.jpg`)
  const hiResFile:File = bucket.file(`${folder}/${item._id.toString()}--${index}--fallback.jpg`)

  logger.info(`Optimizing images for item: ${item._id.toString()}`)
  const uploadResults = await Promise.all([
    imageOptimizer.optimizeToWebp(rawImageBuffer, fullFile),
    imageOptimizer.optimizeToWebp(rawImageBuffer, smallFile, 300),
    imageOptimizer.optimizeToWebp(rawImageBuffer, tinyFile, 100),
    imageOptimizer.optimizeToJpg(rawImageBuffer, normalFile, 300),
    imageOptimizer.optimizeToJpg(rawImageBuffer, hiResFile),
  ]);
  logger.info(`Optimized images for item: ${item._id.toString()}`)
  return [
    mapVariant(uploadResults[0], ['hi-res', 'webp']),
    mapVariant(uploadResults[1], ['small', 'webp']),
    mapVariant(uploadResults[2], ['tiny', 'webp']),
    mapVariant(uploadResults[3], ['default', 'jpg']),
    mapVariant(uploadResults[4], ['hi-res', 'jpg']),
  ]
}

const upload = async (itemId:ObjectId, urls:Array<string>):Promise<void> => {

  const item = await itemRetriever.retrieveById(itemId);

  const variantLists = await Promise.all(urls.map((url, index) => uploadToStorage(item, url, index)))
  const images:Images = {
    images: removeNulls(variantLists).map(variants => ({variants})),
  }

  await itemUpdater.updateOnly(itemId, {images})
}

export const cardImageUploader = {
  upload,
}