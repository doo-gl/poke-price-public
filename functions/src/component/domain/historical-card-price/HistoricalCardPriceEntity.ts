import {Create, Entity} from "../../database/Entity";
import {CardDataSource} from "../card/CardDataSource";
import {PriceDataType} from "./PriceDataType";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";
import {CurrencyAmountLike} from "../money/CurrencyAmount";
import {CardCondition} from "./CardCondition";
import {Timestamp} from "../../external-lib/Firebase";
import {ItemModification} from "../modification/ItemModification";

export const BY_TIMESTAMP_ASC = comparatorBuilder.objectAttributeASC<HistoricalCardPriceEntity, number>(
  historicalPrice => historicalPrice.timestamp.toMillis()
)
export const BY_CURRENCY_AMOUNT_ASC = comparatorBuilder.objectAttributeASC<HistoricalCardPriceEntity, number>(
  historicalPrice => historicalPrice.currencyAmount.amountInMinorUnits
)

export type CreateHistoricalCardPriceEntity = Create<HistoricalCardPriceEntity>;

export enum State {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export interface DeactivationDetails {
  reason:string,
  userId:string,
}

export interface HistoricalCardPriceEntity extends Entity {
  cardId:string,
  timestamp:Timestamp,
  sourceType:CardDataSource,
  sourceId:string|null,
  sourceDetails:any,
  priceDataType:PriceDataType,
  currencyAmount:CurrencyAmountLike,
  searchIds:Array<string>,
  selectionIds:Array<string>,
  condition:CardCondition,
  state:State,
  deactivationDetails:DeactivationDetails|null,
  itemModification?:ItemModification|null,
}