import {EntityDto} from "../EntityDto";
import {CardDataSource} from "../card/CardDataSource";
import {PriceDataType} from "./PriceDataType";
import {CurrencyAmountLike} from "../money/CurrencyAmount";
import {Moment} from "moment";
import {State} from "./HistoricalCardPriceEntity";


export interface HistoricalCardPriceDto extends EntityDto {
  cardId:string,
  timestamp:Moment,
  sourceType:CardDataSource,
  sourceId:string|null,
  sourceDetails:object,
  state:State,
  priceDataType:PriceDataType,
  currencyAmount:CurrencyAmountLike,
  searchIds:Array<string>,
  selectionIds:Array<string>,
}