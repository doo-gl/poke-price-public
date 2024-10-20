import {CardEntity, CardVariant} from "./CardEntity";
import {cardRepository} from "./CardRepository";
import {singleResultRepoQuerier} from "../../database/SingleResultRepoQuerier";
import {byIdRetriever} from "../../database/ByIdRetriever";
import {CardDataSource} from "./CardDataSource";
import {batchIds, Query, SortOrder} from "../../database/BaseCrudRepository";
import {UniqueCard} from "./UniqueCard";
import {UniqueSet} from "../set/UniqueSet";
import {flattenArray} from "../../tools/ArrayFlattener";
import {NotFoundError} from "../../error/NotFoundError";
import {logger} from "firebase-functions";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";

const DATA_NAME = 'card';

const retrieve = (id:string):Promise<CardEntity> => {
  return byIdRetriever.retrieve(cardRepository, id, 'card');
}

const retrieveOptional = (id:string):Promise<CardEntity|null> => {
  return cardRepository.getOne(id);
}

const retrieveBySlug = async (slug:string):Promise<CardEntity> => {
  const cards = await cardRepository.getMany([{field: "slugs", operation: "array-contains", value: slug}])
  if (cards.length === 0) {
    const fallbackCards = await cardRepository.getMany([{field: "slug", operation: "==", value: slug}])
    if (fallbackCards.length === 0) {
      throw new NotFoundError(`Failed to find card with slug: ${slug}`)
    }
    return fallbackCards[0];
  }
  if (cards.length === 1) {
    return cards[0];
  }
  logger.error(`Found ${cards.length} cards for slug ${slug}, returning first`);
  return cards.sort(comparatorBuilder.objectAttributeASC(card => card.dateCreated.toMillis()))[0]
}

const retrieveOptionalBySlug = async (slug:string):Promise<CardEntity|null> => {
  const cards = await cardRepository.getMany([{field: "slugs", operation: "array-contains", value: slug}])
  if (cards.length === 0) {
    const fallbackCards = await cardRepository.getMany([{field: "slug", operation: "==", value: slug}])
    if (fallbackCards.length === 0) {
      return null;
    }
    return fallbackCards[0];
  }
  if (cards.length === 1) {
    return cards[0];
  }
  logger.error(`Found ${cards.length} cards for slug ${slug}, returning first`);
  return cards.sort(comparatorBuilder.objectAttributeASC(card => card.dateCreated.toMillis()))[0]
}

const retrieveByUniqueSet = (set:UniqueSet):Promise<Array<CardEntity>> => {
  return retrieveBySet(set.series, set.set);
}

const retrieveBySet = (series:string, set:string):Promise<Array<CardEntity>> => {
  return cardRepository.getMany([
    {field: "series", operation: "==", value: series},
    {field: "set", operation: "==", value: set},
  ])
}

const retrieveBySetAndNumberAndVariant = (set:string, cardNumber:string, variant:CardVariant):Promise<Array<CardEntity>> => {
  return cardRepository.getMany([
    {field: "set", operation: "==", value: set},
    {field: "numberInSet", operation: "==", value: cardNumber},
    {field: "variant", operation: "==", value: variant},
  ])
}

const retrieveBySetId = (setId:string):Promise<Array<CardEntity>> => {
  return cardRepository.getMany([
    { field: "setId", operation: "==", value: setId },
  ]);
}

const retrieveByUniqueCard = (card:UniqueCard):Promise<CardEntity> => {
  return retrieveBySetNumber(
    card.series,
    card.set,
    card.numberInSet,
    card.variant,
  );
}

const retrieveOptionalByUniqueCard = (card:UniqueCard):Promise<CardEntity|null> => {
  return singleResultRepoQuerier.query<CardEntity>(
    cardRepository,
    [
      {name: "series", value: card.series},
      {name: "set", value: card.set},
      {name: "numberInSet", value: card.numberInSet},
      {name: "variant", value: card.variant},
    ],
    DATA_NAME
  );
}

const retrieveBySetNumber = (series:string, set:string, numberInSet:string, variant:CardVariant):Promise<CardEntity> => {
  return singleResultRepoQuerier.queryOrThrow<CardEntity>(
    cardRepository,
    [
      {name: "series", value: series},
      {name: "set", value: set},
      {name: "numberInSet", value: numberInSet},
      {name: "variant", value: variant},
    ],
    DATA_NAME
  );
}

const retrieveByPokemonTcgId = (pokemonTcgCardId:string):Promise<Array<CardEntity>> => {
  return cardRepository.getMany([
    { field: `externalIdentifiers.${CardDataSource.POKEMON_TCG_API}.id`, operation: '==', value: pokemonTcgCardId },
  ])
}

const retrieveByEbaySourceTimeAsc = (limit:number):Promise<Array<CardEntity>> => {
  return cardRepository.getMany(
    [],
    {
      sort: [{field: "mostRecentEbayPriceSourcing", order: SortOrder.ASC}],
      limit,
    }
  )
}

const retrieveByEbayOpenListingSourceTimeAsc = (limit:number):Promise<Array<CardEntity>> => {
  return cardRepository.getMany(
    [],
    {
      sort: [{field: "mostRecentEbayOpenListingSourcing", order: SortOrder.ASC}],
      limit,
    }
  )
}

const retrieveByStatCalculationTimeAsc = (limit:number):Promise<Array<CardEntity>> => {
  return cardRepository.getMany(
    [],
    {
      sort: [{field: "mostRecentStatCalculation", order: SortOrder.ASC}],
      limit,
    }
  )
}

const retrieveAll = ():Promise<Array<CardEntity>> => {
  return cardRepository.getMany(
    [],
    {
      sort: [
        {field: "series", order: SortOrder.ASC},
        {field: "set", order: SortOrder.ASC},
        {field: "numberInSet", order: SortOrder.ASC},
      ],
    }
  );
}

const retrieveByIds = (ids:Array<string>):Promise<Array<CardEntity>> => {
  return cardRepository.getManyById(ids);
}

const retrieveVisibleByTags = async (tags:Array<string>, limit:number, fromId?:string):Promise<Array<CardEntity>> => {
  const queries:Array<Query<CardEntity>> = tags.map(tag => ({
    field: `queryTags.${tag}`, operation: "==", value: tag,
  }))
  queries.push({ field: "visible", operation: "==", value: true })
  const cards = await cardRepository.getMany(
    queries, {limit, startAfterId: fromId}
  )
  return cards;
}

const retrieveVisibleByIds = async (ids:Array<string>):Promise<Array<CardEntity>> => {
  const idBatches:Array<Array<string>> = batchIds(ids)
  const resultBatches:Array<Array<CardEntity>> = await Promise.all(
    idBatches.map((idBatch) => cardRepository.getMany([
      { field: "visible", operation: "==", value: true },
      { field: "id", operation: "in", value: idBatch },
    ])),
  );
  const results = flattenArray(resultBatches);
  return results;
}

const retrieveReverseHoloForCard = async (cardId:string):Promise<CardEntity|null> => {
  const card = await retrieve(cardId);
  if (card.variant === CardVariant.REVERSE_HOLO) {
    return card;
  }
  const reverseHolo = await singleResultRepoQuerier.query(
    cardRepository,
    [
      { name: "series", value: card.series },
      { name: "set", value: card.set },
      { name: "numberInSet", value: card.numberInSet },
      { name: "variant", value: CardVariant.REVERSE_HOLO },
    ],
    cardRepository.collectionName,
  );
  return reverseHolo;
}

const retrieveByNextPokePriceCalculationTime = (limit:number):Promise<Array<CardEntity>> => {
  return cardRepository.getMany(
    [],
    { limit, sort: [{ field: "nextPokePriceCalculationTime", order: SortOrder.ASC }] }
    )
}

const retrieveByNextStatsCalculationTime = (limit:number):Promise<Array<CardEntity>> => {
  return cardRepository.getMany(
    [],
    { limit, sort: [{ field: "nextStatsCalculationTime", order: SortOrder.ASC }] }
    )
}

const retrieveByNextEbayOpenListingSourcingAsc = (limit:number):Promise<Array<CardEntity>> => {
  return cardRepository.getMany(
    [],
    { limit, sort: [{ field: "nextEbayOpenListingSourcingTime", order: SortOrder.ASC }] }
    )
}

export const cardRetriever = {
  retrieve,
  retrieveOptional,
  retrieveBySlug,
  retrieveOptionalBySlug,
  retrieveAll,
  retrieveBySetNumber,
  retrieveByUniqueCard,
  retrieveBySetAndNumberAndVariant,
  retrieveOptionalByUniqueCard,
  retrieveBySet,
  retrieveBySetId,
  retrieveByUniqueSet,
  retrieveByPokemonTcgId,
  retrieveByEbaySourceTimeAsc,
  retrieveByEbayOpenListingSourceTimeAsc,
  retrieveByStatCalculationTimeAsc,
  retrieveByIds,
  retrieveVisibleByIds,
  retrieveVisibleByTags,
  retrieveReverseHoloForCard,
  retrieveByNextPokePriceCalculationTime,
  retrieveByNextStatsCalculationTime,
  retrieveByNextEbayOpenListingSourcingAsc,
}