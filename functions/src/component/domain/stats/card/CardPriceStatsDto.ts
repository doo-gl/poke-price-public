import {CardId, UniqueCard} from "../../card/UniqueCard";
import {Moment} from "moment";
import {EntityDto} from "../../EntityDto";
import {OpenStats, SoldStats} from "./CardPriceStatsEntity";


export interface CardPriceStatsDto extends EntityDto, UniqueCard, CardId {
  lastCalculationTime:Moment,
  mostRecentPrice:Moment,
  searchUrl:string|null,
  searchId:string|null,
  longViewStats:SoldStats,
  shortViewStats:SoldStats,
  openListingStats:OpenStats|null,
}

