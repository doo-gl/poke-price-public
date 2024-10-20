import {HistoricalCardPriceEntity} from "../../historical-card-price/HistoricalCardPriceEntity";
import {EbayOpenListingEntity} from "../../ebay/open-listing/EbayOpenListingEntity";
import {PriceType} from "./CardPriceSelectionEntity";
import {CardCondition} from "../../historical-card-price/CardCondition";
import {CurrencyCode} from "../../money/CurrencyCodes";
import {cardStatsRetrieverV2} from "./CardStatsRetriever";
import {CardStatsEntityV2, cardStatsUpdater} from "./CardStatsEntityV2";
import {momentToTimestamp, timestampToMoment} from "../../../tools/TimeConverter";
import moment from "moment/moment";

interface StatsIdentifier {
  priceType:PriceType,
  condition:CardCondition,
  currencyCode:CurrencyCode,
  cardId:string,
}

const updateStats = async (stats:CardStatsEntityV2):Promise<void> => {
  const nextUpdateTime = moment().add(24, 'hour')
  const isNextUpdateSoon = timestampToMoment(stats.nextCalculationTime).isBefore(nextUpdateTime)
  if (isNextUpdateSoon) {
    return
  }
  await cardStatsUpdater.update(stats.id, { nextCalculationTime: momentToTimestamp(nextUpdateTime) })
}

const onStatsUpdate = async (statsIdentifier:StatsIdentifier):Promise<void> => {
  const stats = await cardStatsRetrieverV2.retrieveByCardIdAndPriceTypeAndCurrencyCodeAndCondition(
    statsIdentifier.cardId,
    statsIdentifier.priceType,
    statsIdentifier.currencyCode,
    statsIdentifier.condition
  );
  await Promise.all(
    stats.map(stat => updateStats(stat))
  )
}

const onNewHistoricalCardPrice = (price:HistoricalCardPriceEntity):Promise<void> => {
  return onStatsUpdate({
    cardId: price.cardId,
    condition: price.condition,
    currencyCode: price.currencyAmount.currencyCode,
    priceType: PriceType.SOLD_PRICE,
  })
}

const onOpenListingUpdate = (listing:EbayOpenListingEntity):Promise<void> => {
  return onStatsUpdate({
    cardId: listing.cardId,
    condition: listing.condition,
    currencyCode: listing.mostRecentPrice.currencyCode,
    priceType: PriceType.LISTING_PRICE,
  })
}

export const cardStatsNextCalculationUpdater = {
  onNewHistoricalCardPrice,
  onOpenListingUpdate,
}