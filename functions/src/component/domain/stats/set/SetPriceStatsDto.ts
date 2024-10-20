import {SetId, UniqueSet} from "../../set/UniqueSet";
import {CurrencyAmountLike} from "../../money/CurrencyAmount";
import {Moment} from "moment";
import {EntityDto} from "../../EntityDto";


export interface SetPriceStatsDto extends EntityDto, UniqueSet, SetId {
  lastCalculationTime:Moment,
  mostRecentPrice:Moment,
  totalSetPokePrice:CurrencyAmountLike,
}