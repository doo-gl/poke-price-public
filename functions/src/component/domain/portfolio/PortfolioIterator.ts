
import {cardOwnershipRepository} from "../card-ownership/CardOwnershipRepository";
import {toSet} from "../../tools/SetBuilder";
import {toInputValueMap} from "../../tools/MapBuilder";
import {ItemEntity, legacyIdOrFallback} from "../item/ItemEntity";
import {cardItemRetriever} from "../item/CardItemRetriever";


export interface PortfolioDetail {
  card:ItemEntity,
}

const iterate = async (userId:string, detailConsumer:(detail:PortfolioDetail) => void):Promise<void> => {



  await cardOwnershipRepository.iterator()
    .queries([
      { field: "userId", operation: "==", value: userId },
    ])
    .batchSize(50)
    .iterateBatch(async ownerships => {

      const ownedCardIds = [...toSet(ownerships, ownership => ownership.cardId).keys()]
      const cards = await cardItemRetriever.retrieveByIds(ownedCardIds)
      const cardIdToCard = toInputValueMap(cards, card => legacyIdOrFallback(card))

      ownerships.forEach(ownership => {
        const card = cardIdToCard.get(ownership.cardId);
        if (!card) {
          return;
        }
        detailConsumer({
          card,
        })
      })
    })
}

export const portfolioIterator = {
  iterate,
}