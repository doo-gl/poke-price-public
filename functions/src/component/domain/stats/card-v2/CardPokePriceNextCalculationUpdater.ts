import {CardStatsEntityV2} from "./CardStatsEntityV2";
import moment from "moment/moment";
import {momentToTimestamp, timestampToMoment} from "../../../tools/TimeConverter";
import {toInputValueMultiMap} from "../../../tools/MapBuilder";
import {toSet} from "../../../tools/SetBuilder";
import {cardItemRetriever} from "../../item/CardItemRetriever";
import {itemPriceQuerier} from "../../item/ItemPriceQuerier";
import {itemUpdater} from "../../item/ItemEntity";

const onStatsUpdatedForCard = async (cardId:string, stats:Array<CardStatsEntityV2>):Promise<void> => {
  const card = await cardItemRetriever.retrieve(cardId);
  const statIds = toSet(stats, stat => stat.id)
  const soldDetails = itemPriceQuerier.soldDetails(card);
  const listingDetails = itemPriceQuerier.listingDetails(card);
  const statIdsUsedForPokePrice = (soldDetails?.statIds ?? []).concat(listingDetails?.statIds ?? []);
  const statsUsedForPokePrice = statIdsUsedForPokePrice.some(statIdUsedForPokePrice => statIds.has(statIdUsedForPokePrice));
  if (!statsUsedForPokePrice) {
    return;
  }
  const nextUpdateTime = moment().add(24, 'hour')
  const isNextUpdateSoon = moment(card.nextPokePriceCalculationTime).isBefore(nextUpdateTime)
  if (isNextUpdateSoon) {
    return
  }
  await itemUpdater.updateOnly(card._id, { nextPokePriceCalculationTime: nextUpdateTime.toDate() })
}

const onStatsUpdated = async (stats:Array<CardStatsEntityV2>):Promise<void> => {
  const cardIdToStats = toInputValueMultiMap(stats, stat => stat.cardId)
  await Promise.all(
    [...cardIdToStats.entries()].map(async entry => {
      const cardId = entry[0]
      const statsForCard = entry[1]
      await onStatsUpdatedForCard(cardId, statsForCard)
    })
  )
}

export const cardPokePriceNextCalculationUpdater = {
  onStatsUpdated,
}