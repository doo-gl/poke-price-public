import {ItemEntity, ItemPriceDetails, ItemPriceHistoryDetails, ItemPrices} from "./ItemEntity";
import moment from "moment";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";


const calculate = (item:ItemEntity, newItemPrices:ItemPrices):Array<ItemPriceHistoryDetails> => {
  const currentHistory:Array<ItemPriceHistoryDetails> = item.itemPriceHistory ?? [];
  const newHistory:Array<ItemPriceHistoryDetails> = [];
  newHistory.push({
    timestamp: new Date(),
    prices: newItemPrices.prices,
    modificationPrices: newItemPrices.modificationPrices ?? [],
  })
  currentHistory.forEach(historyDetail => {
    // Only keep history details that are younger than the expiry time
    // If a history entry occurred too recently, it is overridden by the new prices
    // both of these are to try and limit the number of history entries stored on the item
    // the full history is stored in the DB and this abridged version is stored on the item itself
    const timestamp = historyDetail.timestamp;
    const expiryTime = moment().subtract(4, 'weeks') // entries expire after 4 weeks
    const isHistoryDetailExpired = moment(timestamp).isBefore(expiryTime)
    const overrideTime = moment().subtract(1, 'day').startOf("day"); // entries can occur at most once every 2 days, otherwise we take whatever the latest was in that 2 day span
    const isHistoryBeingOverridden = moment(timestamp).isAfter(overrideTime)
    if (isHistoryDetailExpired || isHistoryBeingOverridden) {
      return
    }
    newHistory.push(historyDetail)
  })
  newHistory.sort(comparatorBuilder.objectAttributeDESC(value => value.timestamp.getTime()))
  return newHistory;
}

export const itemPriceHistoryCalculator = {
  calculate,
}