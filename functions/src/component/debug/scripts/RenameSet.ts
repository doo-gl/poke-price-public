import {setRetriever} from "../../domain/set/SetRetriever";
import {cardItemRetriever} from "../../domain/item/CardItemRetriever";
import {toCard} from "../../domain/item/CardItem";
import {itemUpdater} from "../../domain/item/ItemEntity";
import {cardCollectionRetriever} from "../../domain/card-collection/CardCollectionRetriever";
import {baseCardCollectionUpdater} from "../../domain/card-collection/CardCollectionRepository";
import {setUpdater} from "../../domain/set/SetUpdater";
import {ConcurrentPromiseQueue} from "concurrent-promise-queue";


const renameSet = async (setId:string, newName:string) => {

  const set = await setRetriever.retrieve(setId)

  const queue = new ConcurrentPromiseQueue({maxNumberOfConcurrentPromises: 5})

  const items = await cardItemRetriever.retrieveBySetId(setId)
  await Promise.all(items.map(item => queue.addPromise(async () => {
    const cardDetails = toCard(item)
    if (!cardDetails) {
      return
    }
    cardDetails.set = newName
    cardDetails.setCode = `${cardDetails.series}|${newName}`
    cardDetails.setDetails.name = newName
    await itemUpdater.updateOnly(item._id, {itemDetails: cardDetails})
  })))

  const parentCollection = await cardCollectionRetriever.retrieveByIdempotencyKey(setId)
  if (parentCollection) {
    await baseCardCollectionUpdater.updateOnly(parentCollection.id, {name: newName})
  }
  const standardCollection = await cardCollectionRetriever.retrieveByIdempotencyKey(`${setId}|STANDARD`)
  if (standardCollection) {
    await baseCardCollectionUpdater.updateOnly(standardCollection.id, {name: `${newName}-standard`})
  }
  const reverseHoloCollection = await cardCollectionRetriever.retrieveByIdempotencyKey(`${setId}|REVERSE_HOLO`)
  if (reverseHoloCollection) {
    await baseCardCollectionUpdater.updateOnly(reverseHoloCollection.id, {name: `${newName}-reverse-holo`})
  }

  await setUpdater.update(setId, {name: newName})

}

export const scriptRenameSet = {
  renameSet,
}