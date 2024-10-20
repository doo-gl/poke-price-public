import {Stats} from "./CardStatsEntityV2";
import {PriceType} from "./CardPriceSelectionEntity";
import {CurrencyCode} from "../../money/CurrencyCodes";
import {CardCondition} from "../../historical-card-price/CardCondition";
import {cardStatsRetrieverV2} from "./CardStatsRetriever";
import {userContext} from "../../../infrastructure/UserContext";
import {MembershipPlan} from "../../membership/MembershipStatus";
import {cardStatsMapper} from "./CardStatsMapper";
import {cardItemRetriever} from "../../item/CardItemRetriever";
import {legacyIdOrFallback} from "../../item/ItemEntity";


export interface PublicCardStatsDto {
  cardStatsId:string,
  cardId:string,
  priceType:PriceType,
  currencyCode:CurrencyCode,
  condition:CardCondition,
  lastCalculatedAt:string,
  from:string,
  to:string,
  periodSizeDays:number,
  stats:Stats|null,
}

export interface PublicCardStatsList {
  results:Array<PublicCardStatsDto>
}

const retrieve = async (cardId:string):Promise<PublicCardStatsList> => {
  const user = userContext.getUser()
  const isSubscribed = user?.membership?.plans.some(plan => plan === MembershipPlan.POKE_PRICE_PRO) ?? false
  const item = await cardItemRetriever.retrieve(cardId)
  const stats = await cardStatsRetrieverV2.retrieveForCardId(legacyIdOrFallback(item))
  const statsWithResults = stats.filter(stat => stat.stats.count > 0);

  if (!isSubscribed) {
    return cardStatsMapper.mapPublicList(statsWithResults)
  } else {
    return cardStatsMapper.mapSubscribedList(statsWithResults)
  }
}

export const publicCardStatsRetriever = {
  retrieve,
}