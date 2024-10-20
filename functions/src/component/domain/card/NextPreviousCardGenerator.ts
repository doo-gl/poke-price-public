import {SetEntity} from "../set/SetEntity";
import {cardRepository} from "./CardRepository";
import {relatedCardRetriever} from "./RelatedCardRetriever";
import {logger} from "firebase-functions";
import {setRetriever} from "../set/SetRetriever";
import {ConcurrentPromiseQueue} from "concurrent-promise-queue";
import {ItemEntity, itemRepository} from "../item/ItemEntity";
import {BatchUpdate, Update} from "../../database/mongo/MongoEntity";
import {cardItemRetriever} from "../item/CardItemRetriever";
import {BY_NUMBER_CARD_COMPARATOR} from "../item/CardItem";
import {relatedItemMapper} from "../item/RelatedItemMapper";

const generateForSet = async (set:SetEntity) => {
  logger.info(`Generating previous / next cards for set: ${set.id}`)
  const cards = await cardItemRetriever.retrieveBySetId(set.id);
  const sortedCards = cards.sort(BY_NUMBER_CARD_COMPARATOR);
  const updates:Array<BatchUpdate<ItemEntity>> = [];
  for (let cardIndex = 0; cardIndex < sortedCards.length; cardIndex++) {
    const previousCard = cardIndex > 0 ? sortedCards[cardIndex - 1] : null;
    const nextCard = cardIndex < sortedCards.length - 1 ? sortedCards[cardIndex + 1] : null;
    const card = sortedCards[cardIndex];
    const update:Update<ItemEntity> = {};
    if (previousCard) {
      update.previousItem = relatedItemMapper.map(previousCard);
    }
    if (nextCard) {
      update.nextItem = relatedItemMapper.map(nextCard);
    }
    if (previousCard || nextCard) {
      updates.push({ id: card._id, update })
    }
  }
  await itemRepository.batchUpdate(updates)
  logger.info(`Generated previous / next cards for set: ${set.id}`)
}

const generateForAll = async () => {
  const sets = await setRetriever.retrieveAll();
  const queue = new ConcurrentPromiseQueue({ maxNumberOfConcurrentPromises: 5 });
  await Promise.all(
    sets.map(async set => {
      await queue.addPromise(() => generateForSet(set))
    })
  )
}

export const nextPreviousCardGenerator = {
  generateForSet,
  generateForAll,
}