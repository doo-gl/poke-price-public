import {PublicCardDto} from "./PublicCardDto";
import {CardEntity} from "./CardEntity";
import {batchIds, SortOrder} from "../../database/BaseCrudRepository";
import {cardRepository} from "./CardRepository";
import {cardQueryDetailBuilder} from "./query/CardQueryDetailBuilder";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";
import {cardDtoMapper} from "./CardDtoMapper";
import {ApiList} from "../PagingResults";
import {cacheBuilder} from "../../database/cache/Cache";
import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {cardQueryViewCountRecorder} from "./query/CardQueryViewCountRecorder";
import moment from "moment/moment";
import {logger} from "firebase-functions";
import {JSONSchemaType} from "ajv";
import {CardsRequestedEvent, CardsRequestedPublishRequest} from "../../event/CardsRequestedTrigger";
import {eventPublisher} from "../../event/EventPublisher";
import {CardByIdRequestedEvent, CardByIdRequestedPublishRequest} from "../../event/CardByIdRequestedTrigger";
import {cardItemRetriever} from "../item/CardItemRetriever";
import {ItemEntity} from "../item/ItemEntity";
import {itemPriceQuerier} from "../item/ItemPriceQuerier";
import {removeNulls} from "../../tools/ArrayNullRemover";

const CACHE_ENTRY_TYPE = 'PUBLIC_CARD_DTO'

export interface CardRequest {
  fromId?:string,
  series?:string,
  set?:string,
  pokemon?:Array<string>,
  number?:string,
  setNumber?:string,
  name?:string,
  rarity?:string,
  artist?:string,
  variant?:string,
  subType?:Array<string>,
  superType?:string,
  energyType?:Array<string>,
  soldPrice?:string,
  listingPrice?:string,
  soldVolume?:string,
  listingVolume?:string,
  totalCirculation?:string,
  supplyVsDemand?:string,
  volatility?:string,
  tags?:Array<string>,
  limit?:number,
}

export const cardRequestSchema:JSONSchemaType<CardRequest> = {
  type: "object",
  properties: {
    fromId: { type: "string", nullable: true },
    series: { type: "string", nullable: true },
    set: { type: "string", nullable: true },
    pokemon: { type: "array", items: { type: "string" }, nullable: true },
    number: { type: "string", nullable: true },
    setNumber: { type: "string", nullable: true },
    name: { type: "string", nullable: true },
    rarity: { type: "string", nullable: true },
    artist: { type: "string", nullable: true },
    variant: { type: "string", nullable: true },
    subType: { type: "array", items: { type: "string" }, nullable: true },
    superType: { type: "string", nullable: true },
    energyType: { type: "array", items: { type: "string" }, nullable: true },
    soldPrice: { type: "string", nullable: true },
    listingPrice: { type: "string", nullable: true },
    soldVolume: { type: "string", nullable: true },
    listingVolume: { type: "string", nullable: true },
    totalCirculation: { type: "string", nullable: true },
    supplyVsDemand: { type: "string", nullable: true },
    volatility: { type: "string", nullable: true },
    tags: { type: "array", items: { type: "string" }, nullable: true },
    limit: { type: "number", nullable: true },
  },
  additionalProperties: false,
  required: [],
}

const BY_PRIORITY_DESC = comparatorBuilder.objectAttributeDESC<ItemEntity, number>(value => {
  const itemPrice = itemPriceQuerier.pokePrice(value)?.price
  return itemPrice?.amountInMinorUnits ?? 0
})

const queryForCards = async (request:CardRequest, limit:number):Promise<Array<CardEntity>> => {
  const startAfterId = request.fromId;
  const req = Object.assign({}, request)
  delete req.fromId;
  const shouldReturnTopCards = Object.values(req).filter(requestParam => !!requestParam).length === 0
  if (shouldReturnTopCards) {
    return cardRepository.getMany(
      [
        { field: "visible", operation: "==", value: true },
      ],
      {
        sort: [{ field: "priority", order: SortOrder.DESC }],
        limit,
        startAfterId,
      }
    )
  }
  const queries = cardQueryDetailBuilder.buildQueries(request);
  queries.push({ field: 'visible', operation: "==", value: true })
  return cardRepository.getMany(queries, { limit, startAfterId })
}

const retrieve = async (request:CardRequest):Promise<ApiList<PublicCardDto>> => {
  const limit = Math.min(request.limit ?? 10, 60);
  const cards = await queryForCards(request, limit);
  const items = await cardItemRetriever.retrieveByIds(cards.map(card => card.id))
  // if we found cards up to the limit, then we assume there are more cards left to query
  // this does not handle the case where there are exactly the limit amount of cards
  const fromId = cards.length === limit ? cards[limit - 1].id : null;
  const sortedCards = items
    .sort(BY_PRIORITY_DESC)
    .map(card => cardDtoMapper.mapPublic(card));
  return {
    results: removeNulls(sortedCards),
    fromId,
  }
}

const RETRIEVE_CACHE = cacheBuilder<CardRequest, ApiList<PublicCardDto>>()
  .entryLifetimeInMinutes(60)
  .build(query => retrieve(query));

const retrieveFromCache = async (request:CardRequest):Promise<ApiList<PublicCardDto>> => {
  const start = moment()
  const result = await RETRIEVE_CACHE.get(CACHE_ENTRY_TYPE, request)
  const end = moment();
  logger.info(`Retrieving cards took: ${end.diff(start, 'milliseconds')}ms`)
  return result;
}

const retrieveCached = async (request:CardRequest):Promise<ApiList<PublicCardDto>> => {
  const result = await Promise.all([
    retrieveFromCache(request),
    cardQueryViewCountRecorder.record(request),
  ])
  const cards = result[0]
  return cards
}

const publishCardsRequestedEvent = async (request:CardRequest):Promise<void> => {
  try {
    const start = moment()
    const publishRequest:CardsRequestedPublishRequest = {
      topicName: 'cards-requested',
      data: {
        request,
      },
    }
    // await eventPublisher.publish<'cards-requested', CardsRequestedEvent>(publishRequest)
    const end = moment()
    logger.info(`Publishing cards requested event took: ${end.diff(start, "milliseconds")}ms`)
  } catch (err:any) {
    logger.error(`Failed to publish cards requested event, ${err.message}`, err)
  }
}

const retrieveFromCacheV2 = async (request:CardRequest):Promise<ApiList<PublicCardDto>> => {
  const cachedResult = await RETRIEVE_CACHE.tryGetFromCache(CACHE_ENTRY_TYPE, request)
  if (cachedResult) {
    return cachedResult;
  }
  const result = await RETRIEVE_CACHE.getValue(CACHE_ENTRY_TYPE, request)
  return result;
}

const retrieveManyV2 = async (request:CardRequest):Promise<ApiList<PublicCardDto>> => {
  const results = await Promise.all([
    retrieveFromCacheV2(request),
    publishCardsRequestedEvent(request),
  ])
  return results[0]
}

const onCardsRequested = async (request:CardRequest):Promise<void> => {
  const cachedResult = await RETRIEVE_CACHE.tryGetFromCache(CACHE_ENTRY_TYPE, request)
  if (!cachedResult) {
    await RETRIEVE_CACHE.getValueAndCache(CACHE_ENTRY_TYPE, request)
  }
  await cardQueryViewCountRecorder.record(request)
}

const retrieveManyById = async (cardIds:Array<string>):Promise<ApiList<PublicCardDto>> => {
  if (cardIds.length > 50) {
    throw new InvalidArgumentError(`Cannot request more than 50 ids`)
  }
  const cards = await cardItemRetriever.retrieveByIds(cardIds)
  return {
    results: removeNulls(cards.map(card => cardDtoMapper.mapPublic(card))),
    fromId: null,
  }
}

const RETRIEVE_MANY_BY_ID_CACHE = cacheBuilder<{cardIds:Array<string>}, ApiList<PublicCardDto>>()
  .entryLifetimeInMinutes(60)
  .build(query => retrieveManyById(query.cardIds));

const retrieveManyByIdCached = async (cardIds:Array<string>):Promise<ApiList<PublicCardDto>> => {
  return RETRIEVE_MANY_BY_ID_CACHE.get(CACHE_ENTRY_TYPE, { cardIds: cardIds.sort() });
}

const retrieveManyByIdForV2Cache = async (cardIds:Array<string>):Promise<ApiList<PublicCardDto>> => {
  const cardEntities = await cardItemRetriever.retrieveByIds(cardIds)
  return {
    results: removeNulls(cardEntities.map(card => cardDtoMapper.mapPublic(card))),
    fromId: null,
  }
}

const RETRIEVE_MANY_BY_ID_CACHE_V2 = cacheBuilder<{cardIds:Array<string>}, ApiList<PublicCardDto>>()
  .entryLifetimeInMinutes(60)
  .build(query => retrieveManyByIdForV2Cache(query.cardIds));

const retrieveManyByIdV2 = async (cardIds:Array<string>):Promise<ApiList<PublicCardDto>> => {
  if (cardIds.length > 250) {
    throw new InvalidArgumentError(`Requested ${cardIds.length}, this is too many.`)
  }
  const batchedCardIds = batchIds(cardIds.sort())
  const batchesToCache:Array<Array<string>> = [];
  const cards:Array<PublicCardDto> = [];
  await Promise.all(batchedCardIds.map(async cardIdBatch => {
    const cachedResult = await RETRIEVE_MANY_BY_ID_CACHE_V2.tryGetFromCache(CACHE_ENTRY_TYPE, {cardIds: cardIdBatch});
    if (cachedResult) {
      cachedResult.results.forEach(card => cards.push(card))
      return;
    }
    batchesToCache.push(cardIdBatch)
    const cardsToReturn = await RETRIEVE_MANY_BY_ID_CACHE_V2.getValue(CACHE_ENTRY_TYPE, {cardIds: cardIdBatch})
    cardsToReturn.results.forEach(card => cards.push(card))
  }))
  await publishCardByIdRequestedEvent(batchesToCache)
  return {
    results: cards,
    fromId: null,
  };
}

const publishCardByIdRequestedEvent = async (cardIdBatches:Array<Array<string>>):Promise<void> => {
  try {
    const start = moment()
    const publishRequest:CardByIdRequestedPublishRequest = {
      topicName: 'card-by-id-requested',
      data: {
        cardIdBatches,
      },
    }
    // await eventPublisher.publish<'card-by-id-requested', CardByIdRequestedEvent>(publishRequest)
    const end = moment()
    logger.info(`Publishing card by id requested event took: ${end.diff(start, "milliseconds")}ms`)
  } catch (err:any) {
    logger.error(`Failed to publish card by id requested event, ${err.message}`, err)
  }
}

const onCardByIdRequested = async (request:CardByIdRequestedEvent):Promise<void> => {
  logger.info(`Saving cached result for ${request.cardIdBatches} card id batches`)
  await Promise.all(request.cardIdBatches.map(async cardIdBatch => {
    const cachedResult = await RETRIEVE_MANY_BY_ID_CACHE_V2.tryGetFromCache(CACHE_ENTRY_TYPE, {cardIds: cardIdBatch})
    if (!cachedResult) {
      logger.info(`Didn't find cache result, saving.`)
      await RETRIEVE_MANY_BY_ID_CACHE_V2.getValueAndCache(CACHE_ENTRY_TYPE, {cardIds: cardIdBatch})
    } else {
      logger.info(`Found cached result.`)
    }
  }))
}

export const publicCardDtoRetrieverV2 = {
  queryForCards,
  retrieve,
  retrieveCached,
  retrieveManyById,
  retrieveManyByIdCached,
  retrieveManyV2,
  onCardsRequested,
  retrieveManyByIdV2,
  onCardByIdRequested,
}