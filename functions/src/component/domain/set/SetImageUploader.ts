import {setRetriever} from "./SetRetriever";
import {logger} from "firebase-functions";
import axios from "axios";
import {appHolder} from "../../infrastructure/AppHolder";
import {isProduction} from "../../infrastructure/ProductionDecider";
import {imageOptimizer} from "../../tools/ImageOptimizer";
import {setUpdater} from "./SetUpdater";
import {cardCollectionRetriever} from "../card-collection/CardCollectionRetriever";
import {baseCardCollectionUpdater} from "../card-collection/CardCollectionRepository";

const uploadImage = async (setId:string, url:string, imageName:string, format:'png'|'jpg', width?:number):Promise<string> => {
  const set = await setRetriever.retrieve(setId);

  logger.info(`Fetching image for set: ${set.id}, url: ${url}`)
  const response = await axios.get(url, { responseType: "arraybuffer" })
  const rawImageBuffer = Buffer.from(response.data, 'binary');
  logger.info(`Fetched url: ${url}`)

  const app = appHolder.getAdminApp()
  const bucket = app.storage().bucket('INSERT_GOOGLE_PROJECT_HERE.appspot.com')
  const folder = isProduction() ? 'sets' : 'test/sets';
  const file = bucket.file(`${folder}/${set.id}--${imageName}.${format}`)

  logger.info(`Optimizing images for set: ${set.id}`)

  format === 'jpg'
    ? await imageOptimizer.optimizeToJpg(rawImageBuffer, file, width)
    : await imageOptimizer.optimizeToPng(rawImageBuffer, file, width)

  logger.info(`Optimized images for set: ${set.id}`)
  return file.publicUrl()
}

const uploadLogo = async (setId:string, url:string) => {
  const newUrl = await uploadImage(setId, url, 'logo', 'png')

  await setUpdater.update(setId, { imageUrl: newUrl })
  const parentCollection = await cardCollectionRetriever.retrieveOptionalByIdempotencyKey(setId)
  if (parentCollection) {
    const collections = await cardCollectionRetriever.retrieveDescendants(parentCollection.id)
    await Promise.all(
      collections.concat([parentCollection])
        .map(collection => baseCardCollectionUpdater.updateOnly(collection.id, { imageUrl: newUrl }))
    )
  }
}

const uploadSymbol = async (setId:string, url:string) => {
  const newUrl = await uploadImage(setId, url, 'symbol', 'png')

  await setUpdater.update(setId, { symbolUrl: newUrl })
}

const uploadBackgroundUrl = async (setId:string, url:string) => {
  const newUrl = await uploadImage(setId, url, 'background', 'jpg', 900)

  await setUpdater.update(setId, { backgroundImageUrl: newUrl })
  const parentCollection = await cardCollectionRetriever.retrieveOptionalByIdempotencyKey(setId)
  if (parentCollection) {
    const collections = await cardCollectionRetriever.retrieveDescendants(parentCollection.id)
    await Promise.all(
      collections.concat([parentCollection])
        .map(collection => baseCardCollectionUpdater.updateOnly(collection.id, { backgroundImageUrl: newUrl }))
    )
  }

}

export const setImageUploader = {
  uploadLogo,
  uploadSymbol,
  uploadBackgroundUrl,
}