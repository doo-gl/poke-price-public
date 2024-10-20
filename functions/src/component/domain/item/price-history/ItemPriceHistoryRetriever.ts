import {ItemPriceHistoryEntity, itemPriceHistoryRepository} from "./ItemPriceHistoryEntity";
import {singleResultRepoQuerier} from "../../../database/SingleResultRepoQuerier";


const retrieveForItem = (itemId:string):Promise<ItemPriceHistoryEntity|null> => {
  return singleResultRepoQuerier.query(
    itemPriceHistoryRepository,
    [{name: "itemId", value: itemId}],
    itemPriceHistoryRepository.collectionName
  )
}

export const itemPriceHistoryRetriever = {
  retrieveForItem,
}