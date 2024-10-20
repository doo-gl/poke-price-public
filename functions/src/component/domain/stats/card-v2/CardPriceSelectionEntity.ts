import {Entity} from "../../../database/Entity";
import {CurrencyCode} from "../../money/CurrencyCodes";
import {SearchParams} from "../../ebay/search-param/EbayCardSearchParamEntity";
import {CardCondition} from "../../historical-card-price/CardCondition";
import {repositoryFactory} from "../../../database/RepositoryFactory";
import {EntityDto} from "../../EntityDto";

const COLLECTION_NAME = 'card-price-selection'

export enum PriceType {
  SOLD_PRICE = 'SOLD_PRICE',
  LISTING_PRICE = 'LISTING_PRICE',
}

export interface CardPriceSelectionEntity extends Entity {
  cardId:string,
  searchId:string,

  priceType:PriceType,
  currencyCode:CurrencyCode,
  searchParams:SearchParams,
  condition:CardCondition,

  hasReconciled:boolean,
}

const result = repositoryFactory.build<CardPriceSelectionEntity>(COLLECTION_NAME);
export const cardPriceSelectionRepository = result.repository;
export const cardPriceSelectionCreator = result.creator;
export const cardPriceSelectionUpdater = result.updater;

export interface CardPriceSelectionDto extends EntityDto {
  cardId:string,
  searchId:string,

  priceType:PriceType,
  currencyCode:CurrencyCode,
  searchParams:SearchParams,
  condition:CardCondition,

  hasReconciled:boolean,
}