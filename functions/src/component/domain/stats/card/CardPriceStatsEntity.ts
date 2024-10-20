import {Entity} from "../../../database/Entity";
import {CardId, UniqueCard} from "../../card/UniqueCard";
import {PriceStats} from "./v2/StatsCalculator";
import {Timestamp} from "../../../external-lib/Firebase";


// TODO remove nullability on stats once v2 has run for more than a day
export interface SoldStats extends PriceStats {
  cardPriceIds:Array<string>,
  from:Timestamp|null,
  to:Timestamp|null,
  mostRecentSoldPrice:Timestamp|null,
}

export interface OpenStats extends PriceStats {
  openListingIds:Array<string>,
  timestamp:Timestamp,
}

export interface CardPriceStatsEntity extends Entity, UniqueCard, CardId {
  lastCalculationTime:Timestamp,
  mostRecentPrice:Timestamp,
  searchUrl:string|null,
  openListingUrl:string|null,
  searchId:string|null,
  longViewStats:SoldStats,
  pokePriceStats:SoldStats, // TODO remove this field once v2 stats has run for more than a day, use short view stats instead
  shortViewStats:SoldStats,
  openListingStats:OpenStats|null,
}
