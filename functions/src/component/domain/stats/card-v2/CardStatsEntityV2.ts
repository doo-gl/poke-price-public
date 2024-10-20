import {Entity} from "../../../database/Entity";
import {CurrencyAmountLike} from "../../money/CurrencyAmount";
import {PriceType} from "./CardPriceSelectionEntity";
import {CurrencyCode} from "../../money/CurrencyCodes";
import {CardCondition} from "../../historical-card-price/CardCondition";
import {repositoryFactory} from "../../../database/RepositoryFactory";
import {EntityDto} from "../../EntityDto";
import {Timestamp} from "../../../external-lib/Firebase";
import {ModificationStats} from "./CardStatsUpdateCalculator";

const COLLECTION_NAME = 'card-stats-v2'

export interface Stats {
  count:number,
  min:CurrencyAmountLike,
  firstQuartile?:CurrencyAmountLike,
  mean:CurrencyAmountLike,
  median:CurrencyAmountLike,
  thirdQuartile?:CurrencyAmountLike,
  max:CurrencyAmountLike,
  standardDeviation:CurrencyAmountLike,
  movingAverageFive:CurrencyAmountLike,
  movingAverageTen:CurrencyAmountLike,
  movingAverageTwenty:CurrencyAmountLike,
}

export interface CardStatsEntityV2 extends Entity {
  stats:Stats,
  from:Timestamp,
  to:Timestamp,
  itemIds:Array<string>, // this should be called price ids as they point to open listings / sold prices
  selectionId:string,
  cardId:string,
  periodSizeDays:number,
  priceType:PriceType,
  currencyCode:CurrencyCode,
  condition:CardCondition,
  lastCalculatedAt:Timestamp,
  nextCalculationTime:Timestamp,
  modificationKeys?:Array<string>
  modificationStats?:Array<ModificationStats>
}

const result = repositoryFactory.build<CardStatsEntityV2>(COLLECTION_NAME);
export const cardStatsRepository = result.repository;
export const cardStatsCreator = result.creator;
export const cardStatsUpdater = result.updater;

export interface CardStatsDtoV2 extends EntityDto {
  stats:Stats,
  selectionId:string,
  cardId:string,
  from:string,
  to:string,
  periodSizeDays:number,
  itemIds:Array<string>,
  priceType:PriceType,
  currencyCode:CurrencyCode,
  condition:CardCondition,
  lastCalculatedAt:string,
  nextCalculationTime:string,
}