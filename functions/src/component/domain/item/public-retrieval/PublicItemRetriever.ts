import {ApiList} from "../../PagingResults";
import {ItemDto} from "../ItemDto";
import {itemMapper} from "../ItemMapper";
import {cardItemRetriever} from "../CardItemRetriever";


export interface PublicItemRequest {
  itemIds:Array<string>
}

const retrieve = async (request:PublicItemRequest):Promise<ApiList<ItemDto>> => {
  const cards = await cardItemRetriever.retrieveByIds(request.itemIds)
  const items = await itemMapper.mapCards(cards)
  return {
    results: items,
    fromId: null,
  }
}

export const publicItemRetriever = {
  retrieve,
}