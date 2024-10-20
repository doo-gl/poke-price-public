import * as moment from "moment";
import {CurrencyAmountLike} from "../money/CurrencyAmount";

export class CardPriceData {
  constructor(
    readonly series: string,
    readonly set: string,
    readonly setNumber: string,
    readonly setCount: number,
    readonly name: string,
    readonly price: CurrencyAmountLike,
    readonly timestamp: moment.Moment
  ) {
  }
}