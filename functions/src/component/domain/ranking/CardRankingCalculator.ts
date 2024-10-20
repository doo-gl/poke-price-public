import moment, {Moment} from "moment";
import {createRankingKey, Dimension, Metric, RankedCard} from "./CardRankingEntity";
import {cardsForRankingRetriever} from "./CardsForRankingRetriever";
import {CardEntity} from "../card/CardEntity";
import {UnexpectedError} from "../../error/UnexpectedError";
import {fromCurrencyAmountLike} from "../money/CurrencyAmount";
import {lodash} from "../../external-lib/Lodash";
import {indicator} from "ordinal";

export interface RankingRequest {
  dimensions:Array<Dimension>,
  metric:Metric,
  count:number,
}
export interface RankingResponse extends RankingRequest {
  cardIds:Array<string>,
  key:string,
  rankedCards:Array<RankedCard>,
  timestamp:Moment,
}

const mapToValue = (card:CardEntity, metric:Metric):{value:any, displayValue:string} => {
  if  (metric === Metric.MOST_VALUABLE) {
    return {
      value: card.pokePrice?.price,
      displayValue: card.pokePrice ? fromCurrencyAmountLike(card.pokePrice.price).toString() : '',
    }
  }
  if (metric === Metric.SOLD_VOLUME) {
    return {
      value: card.pokePrice?.volume,
      displayValue: card.pokePrice ? `${card.pokePrice.volume}` : '',
    }
  }
  if (metric === Metric.LISTING_VOLUME) {
    return {
      value: card.pokePrice?.openListingVolume,
      displayValue: card.pokePrice ? `${card.pokePrice.openListingVolume}` : '',
    }
  }
  if (metric === Metric.SOLD_VOLATILITY) {
    return {
      value: card.pokePrice?.shortViewStandardDeviation,
      displayValue: card.pokePrice && card.pokePrice.shortViewStandardDeviation ? fromCurrencyAmountLike(card.pokePrice.shortViewStandardDeviation).toString() : '',
    }
  }
  throw new UnexpectedError(`Unrecognised metric: ${metric}`);
}

const calculate = async (request:RankingRequest):Promise<RankingResponse> => {

  const cards = await cardsForRankingRetriever.retrieve(request);

  const rankedCards:Array<RankedCard> = [];
  const cardIds:Array<string> = [];
  let currentRankedCard:RankedCard|null = null;

  cards.forEach(card => {
    const valuePair = mapToValue(card, request.metric);
    if (valuePair.value === null || valuePair.value === undefined) {
      return;
    }

    cardIds.push(card.id);

    if (!currentRankedCard) {
      currentRankedCard = {
        cardIds: [card.id],
        position: indicator(1),
        value: valuePair.value,
        displayValue: valuePair.displayValue,
      }
    } else if (lodash.isEqual(currentRankedCard.value, valuePair.value)) {
      currentRankedCard.cardIds.push(card.id);
    } else {
      rankedCards.push(currentRankedCard);
      currentRankedCard = {
        cardIds: [card.id],
        position: indicator(rankedCards.length + 1),
        value: valuePair.value,
        displayValue: valuePair.displayValue,
      }
    }
  })
  if (currentRankedCard) {
    rankedCards.push(currentRankedCard);
  }

  return {
    ...request,
    cardIds,
    rankedCards,
    timestamp: moment(),
    key: createRankingKey(request.metric, request.dimensions),
  }
}

export const cardRankingCalculator = {
  calculate,
}