import {legacyIdOrFallback} from "../item/ItemEntity";
import {ItemStat} from "./StatCalculationContext";
import {dedupe} from "../../tools/ArrayDeduper";
import {itemPriceQuerier} from "../item/ItemPriceQuerier";
import {CurrencyCode} from "../money/CurrencyCodes";
import {itemRetriever} from "../item/ItemRetriever";
import {currencyExchanger} from "../money/CurrencyExchanger";


const retrieveMany = async (itemIds:Array<string>, currencyCode:CurrencyCode):Promise<Array<ItemStat>> => {
  const exchanger = await currencyExchanger.buildExchanger(currencyCode)

  const items = await itemRetriever.retrieveManyByIdOrLegacyId(itemIds)

  const dedupedItems = dedupe(items, item => legacyIdOrFallback(item))
  const itemStats = dedupedItems.map(item => {
    const modificationKeyToPrice = itemPriceQuerier.modificationPrices(
      item,
      currencyCode,
      exchanger
    )
    const pokePrice = itemPriceQuerier.pokePrice(item, currencyCode)
    return {
      itemId: legacyIdOrFallback(item),
      soldPrice: pokePrice?.price ?? null,
      soldPriceSource: pokePrice?.priceSource ?? null,
      modificationKeyToPrice,
    }
  })
  return itemStats
}

export const statRetriever = {
  retrieveMany,
}