import {ItemEntity, languageOrFallback, SingleCardItemDetails, SourcedPrices} from "../../../item/ItemEntity";
import {CurrencyCode} from "../../../money/CurrencyCodes";
import {
  pokemonTcgApiPriceHistoryRetriever,
} from "../../../pokemon-tcg-api-v2/price-scraping/PokemonTcgApiPriceHistoryRetriever";
import {tcgPlayerPriceMapper} from "./TcgPlayerPriceMapper";
import {cardMarketPriceMapper} from "./CardMarketPriceMapper";
import {
  PokemonTcgApiPriceHistoryEntity,
} from "../../../pokemon-tcg-api-v2/price-scraping/PokemonTcgApiPriceHistoryEntity";
import {toCard} from "../../../item/CardItem";
import {CardVariant} from "../../../card/CardEntity";
import {cardItemRetriever} from "../../../item/CardItemRetriever";
import {logger} from "firebase-functions";
import {UniqueCard} from "../../../card/UniqueCard";

const findStandardCardItem = async (cardDetails:SingleCardItemDetails):Promise<ItemEntity|null> => {
  let set = cardDetails.set
  if (cardDetails.variant === CardVariant.FIRST_EDITION) {
    set = set.replace("-1st-edition", "-unlimited")
  }
  if (cardDetails.variant === CardVariant.SHADOWLESS) {
    set = set.replace("-shadowless", "-unlimited")
  }
  const uniqueCard:UniqueCard = {
    series: cardDetails.series,
    set,
    numberInSet: cardDetails.cardNumber,
    variant: CardVariant.DEFAULT,
    language: languageOrFallback(cardDetails.language),
  }
  const standardCardItem = await cardItemRetriever.retrieveOptionalByUniqueCard(uniqueCard)
  if (!standardCardItem) {
    const originalCard:UniqueCard = {
      series: cardDetails.series,
      set: cardDetails.set,
      numberInSet: cardDetails.cardNumber,
      variant: cardDetails.variant,
      language: languageOrFallback(cardDetails.language),
    }
    logger.info(`Failed to find standard card for ${JSON.stringify(uniqueCard)}, Originally: ${JSON.stringify(originalCard)}`)
  }

  return standardCardItem
}

const findPriceHistory = async (item:ItemEntity):Promise<PokemonTcgApiPriceHistoryEntity|null> => {

  const cardDetails = toCard(item)
  if (!cardDetails) {
    return null
  }

  let itemId = null
  const cardVariant = cardDetails.variant
  if (cardVariant !== CardVariant.DEFAULT) {
    const standardItem = await findStandardCardItem(cardDetails)
    if (!standardItem) {
      return null
    }
    itemId = standardItem._id.toString()
  } else {
    itemId = item._id.toString()
  }

  const priceHistory = await pokemonTcgApiPriceHistoryRetriever.retrieveMostRecentForItemId(itemId)
  return priceHistory
}

const calculate = async (item:ItemEntity, currencies:Array<CurrencyCode>):Promise<SourcedPrices> => {

  const tcgApiPriceHistory = await findPriceHistory(item)
  if (!tcgApiPriceHistory) {
    return {cardMarketPrices: [], tcgPlayerPrices: [], priceId: null}
  }
  const tcgPlayerPrices = await tcgPlayerPriceMapper.map(item, currencies, tcgApiPriceHistory.tcgPlayer)
  const cardMarketPrices = await cardMarketPriceMapper.map(item, currencies, tcgApiPriceHistory.cardMarket)
  return {cardMarketPrices, tcgPlayerPrices, priceId: tcgApiPriceHistory.id}
}

export const sourcedItemPriceCalculator = {
  calculate,
}