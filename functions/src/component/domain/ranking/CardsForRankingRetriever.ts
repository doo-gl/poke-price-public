import {RankingRequest} from "./CardRankingCalculator";
import {CardEntity} from "../card/CardEntity";
import {Dimension, DimensionName, Metric} from "./CardRankingEntity";
import {Query, Sort, SortOrder} from "../../database/BaseCrudRepository";
import {UnexpectedError} from "../../error/UnexpectedError";
import {cardRepository} from "../card/CardRepository";
import {Comparator, comparatorBuilder} from "../../infrastructure/ComparatorBuilder";

const mapToQuery = (dimension:Dimension):Query<CardEntity> => {
  if (dimension.name === DimensionName.SERIES) {
    return { field: 'series', operation: '==', value: dimension.value };
  }
  if (dimension.name === DimensionName.SET) {
    return { field: 'set', operation: '==', value: dimension.value };
  }
  if (dimension.name === DimensionName.ARTIST) {
    return { field: 'artist', operation: '==', value: dimension.value };
  }
  if (dimension.name === DimensionName.RARITY) {
    return { field: 'rarity', operation: '==', value: dimension.value };
  }
  if (dimension.name === DimensionName.SUPER_TYPE) {
    return { field: 'superType', operation: '==', value: dimension.value };
  }
  if (dimension.name === DimensionName.POKEMON) {
    return { field: 'pokemon', operation: 'array-contains', value: dimension.value };
  }
  if (dimension.name === DimensionName.SUB_TYPE) {
    return { field: 'subTypes', operation: 'array-contains', value: dimension.value };
  }
  if (dimension.name === DimensionName.TYPE) {
    return { field: 'types', operation: 'array-contains', value: dimension.value };
  }
  throw new UnexpectedError(`Unrecognised dimension ${dimension.name}`);
}

const mapToSort = (metric:Metric):Sort<CardEntity> => {
  if  (metric === Metric.MOST_VALUABLE) {
    return { field: 'pokePrice.price', order: SortOrder.DESC };
  }
  if (metric === Metric.SOLD_VOLUME) {
    return { field: 'pokePrice.volume', order: SortOrder.DESC };
  }
  if (metric === Metric.LISTING_VOLUME) {
    return { field: 'pokePrice.openListingVolume', order: SortOrder.DESC };
  }
  if (metric === Metric.SOLD_VOLATILITY) {
    return { field: 'pokePrice.shortViewStandardDeviation', order: SortOrder.DESC };
  }
  throw new UnexpectedError(`Unrecognised metric: ${metric}`);
}

const mapToComparator = (metric:Metric):Comparator<CardEntity> => {
  if  (metric === Metric.MOST_VALUABLE) {
    return comparatorBuilder.objectAttributeDESC(card => card.pokePrice?.price.amountInMinorUnits)
  }
  if (metric === Metric.SOLD_VOLUME) {
    return comparatorBuilder.objectAttributeDESC(card => card.pokePrice?.volume)
  }
  if (metric === Metric.LISTING_VOLUME) {
    return comparatorBuilder.objectAttributeDESC(card => card.pokePrice?.openListingVolume)
  }
  if (metric === Metric.SOLD_VOLATILITY) {
    return comparatorBuilder.objectAttributeDESC(card => card.pokePrice?.shortViewStandardDeviation?.amountInMinorUnits)
  }
  throw new UnexpectedError(`Unrecognised metric: ${metric}`);
}

const retrieve = async (request:RankingRequest):Promise<Array<CardEntity>> => {
  const sort = mapToSort(request.metric);
  const queries = request.dimensions.map(mapToQuery);
  if (queries.length === 0) {
    return cardRepository.getMany([], {limit: request.count, sort: [sort]});
  }
  const overLimit = request.count + 1;
  const initialResults = await cardRepository.getMany(queries, {limit: overLimit, sort: []});
  if (initialResults.length < overLimit) {
    // results are smaller than the limit, so just sort in memory and return.
    const comparator = mapToComparator(request.metric);
    return initialResults.sort(comparator);
  }
  // more results than limit, so need to use the ordering (and therefore an index)
  return cardRepository.getMany(queries, {limit: request.count, sort: [sort]});
}

export const cardsForRankingRetriever = {
  retrieve,
}