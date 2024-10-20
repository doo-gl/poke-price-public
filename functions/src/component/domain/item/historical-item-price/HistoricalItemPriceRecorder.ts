import {ItemEntity, ItemPriceDetails, ItemPrices} from "../ItemEntity";
import {Create} from "../../../database/Entity";
import {historicalItemPriceCreator, HistoricalItemPriceEntity} from "./HistoricalItemPriceEntity";
import {TimestampStatic} from "../../../external-lib/Firebase";
import {priceHistoryUpdateHandler} from "../price-history/PriceHistoryUpdateHandler";


const record = async (item:ItemEntity, newItemPrices:ItemPrices):Promise<void> => {
  const creates:Array<Create<HistoricalItemPriceEntity>> = [];
  const itemId = item._id.toString();
  const timestamp = TimestampStatic.now()
  newItemPrices.prices.forEach(newPrice => {
    creates.push({
      itemId,
      timestamp,
      ...newPrice,
    })
  })
  newItemPrices.modificationPrices?.forEach(newPrice => {
    creates.push({
      itemId,
      timestamp,
      ...newPrice,
    })
  })
  await historicalItemPriceCreator.batchCreate(creates)
  await priceHistoryUpdateHandler.onNewHistoricItemPrices(item, creates)
}

export const historicalItemPriceRecorder = {
  record,
}