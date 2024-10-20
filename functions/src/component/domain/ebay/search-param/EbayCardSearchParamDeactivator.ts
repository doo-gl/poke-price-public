import {EbayCardSearchParamEntity} from "./EbayCardSearchParamEntity";
import {ebaySearchParamRetriever} from "./EbayCardSearchParamRetriever";
import {ebaySearchParamUpdater} from "./EbayCardSearchParamUpdater";
import {setRetriever} from "../../set/SetRetriever";
import {setPriceStatsRetriever} from "../../stats/set/SetPriceStatsRetriever";
import {setPriceStatsRecalculator} from "../../stats/set/SetPriceStatsRecalculator";
import {cardItemRetriever} from "../../item/CardItemRetriever";
import {toCard} from "../../item/CardItem";


export const deactivateForCard = async (cardId:string):Promise<Array<EbayCardSearchParamEntity>> => {

  const searchParams = await ebaySearchParamRetriever.retrieveSearchParamsForCardId(cardId);
  const deactivatedSearchParams = await Promise.all(
    searchParams
      .filter(searchParam => searchParam.active)
      .map(searchParam => {
        return ebaySearchParamUpdater.update(searchParam.id, { active: false });
      })
  )

  // const cardStats = await cardPriceStatsRetriever.retrieveStatsForCard(cardId);
  // if (cardStats) {
  //   const updatedStats = await cardPriceStatsRecalculator.recalculateStats(cardStats.cardId);
  // }

  const card = await cardItemRetriever.retrieve(cardId);
  const cardDetails = toCard(card)
  if (!cardDetails) {
    return deactivatedSearchParams;
  }
  const set = await setRetriever.retrieve(cardDetails.setId);
  const setStats = await setPriceStatsRetriever.retrieveStatsForSet(set.id);
  if (setStats) {
    const updatedStats = await setPriceStatsRecalculator.recalculateStats(setStats);
  }

  return deactivatedSearchParams
}

export const ebayCardSearchParamDeactivator = {
  deactivateForCard,
}