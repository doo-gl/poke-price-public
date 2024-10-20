import {Price} from "../../stats/card-v2/StatsPriceRetriever";
import {CurrencyAmountLike} from "../../money/CurrencyAmount";
import {CurrencyCode} from "../../money/CurrencyCodes";
import {Moment} from "moment";
import {HistoricalCardStatsEntity} from "../../stats/card-v2/HistoricalCardStatsEntity";


interface BackfillContext {
  getPrice: (id:string) => Promise<Price>,
  exchange: (price:CurrencyAmountLike, currencyCode:CurrencyCode, timestamp:Moment) => Promise<CurrencyAmountLike>,
  getCardStatsAt: (cardStatsId:string, date:Moment) => Promise<HistoricalCardStatsEntity|null>,
}

const backfill = async (itemId:string):Promise<void> => {
  // not doing this right now - going to focus on building out FB funnel instead

  // going to calculate the price of the item every 3 days going back in time


  // fetch item
  // fetch card stats for item
  // check for current history, see where the current history ends
  // start going back 3 days at a time from where the history ends
  // at a date:
  // - get the card stats as they would have been on that date
  // - run the fallback algorithm, if no prices have been decided, attempt to find tcgplayer price
  // - use the produced stats to build item price details
  // gather all the item price details and save them as history
}