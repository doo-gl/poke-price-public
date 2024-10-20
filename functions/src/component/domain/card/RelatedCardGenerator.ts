import {SetEntity} from "../set/SetEntity";
import {ConcurrentPromiseQueue} from "concurrent-promise-queue";
import {logger} from "firebase-functions";
import {relatedCardRetriever} from "./RelatedCardRetriever";
import {removeNulls} from "../../tools/ArrayNullRemover";
import {cardItemRetriever} from "../item/CardItemRetriever";
import {BatchUpdate} from "../../database/mongo/MongoEntity";
import {ItemEntity, itemRepository} from "../item/ItemEntity";


const generateForSet = async (set:SetEntity):Promise<void> => {
  logger.info(`Generating related cards for set: ${set.id}`)
  const cards = await cardItemRetriever.retrieveBySetId(set.id);
  const queue = new ConcurrentPromiseQueue<BatchUpdate<ItemEntity>>({maxNumberOfConcurrentPromises: 5})
  const updates:Array<BatchUpdate<ItemEntity>> = removeNulls(
    await Promise.all(
      cards.map(async card => {
        return await queue.addPromise(async () => {
          const relatedCards = await relatedCardRetriever.retrieveForCard(card);
          return {
            id: card._id,
            update: { relatedItems: relatedCards },
          }
        })
      })
    )
  );
  await itemRepository.batchUpdate(updates)
  logger.info(`Generated related cards for set: ${set.id}`)
}

const generateForItems = async (items:Array<ItemEntity>) => {
  const updates:Array<BatchUpdate<ItemEntity>> = await Promise.all(
    items.map(async item => {
      const relatedCards = await relatedCardRetriever.retrieveForCard(item);
      return {
        id: item._id,
        update: { relatedItems: relatedCards },
      }
    })
  )
  await itemRepository.batchUpdate(updates)
}

const generateForAll = async () => {
  await itemRepository.iterator()
    .pageSize(50)
    .iterateBatch(async cards => {
      await generateForItems(cards)
    })

}

export const relatedCardGenerator = {
  generateForSet,
  generateForAll,
  generateForItems,
}