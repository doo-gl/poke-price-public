import {Entity} from "../../../database/Entity";
import {SetId, UniqueSet} from "../../set/UniqueSet";
import {CurrencyAmountLike} from "../../money/CurrencyAmount";
import {Timestamp} from "../../../external-lib/Firebase";


export interface SetPriceStatsEntity extends Entity, UniqueSet, SetId {
  lastCalculationTime:Timestamp,
  mostRecentPrice:Timestamp,
  totalSetPokePrice:CurrencyAmountLike,
}