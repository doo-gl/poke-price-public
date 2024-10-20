import {CardCollectionEntity} from "./CardCollectionEntity";
import {setRetriever} from "../set/SetRetriever";
import {capitaliseKey} from "../../tools/KeyConverter";
import {timestampToMoment} from "../../tools/TimeConverter";
import moment from "moment/moment";
import {CurrencyAmountLike, fromCurrencyAmountLike, Zero} from "../money/CurrencyAmount";
import {CurrencyCode} from "../money/CurrencyCodes";
import {cardCollectionCreator} from "./CardCollectionCreator";
import {collectionVisibilityUpdater} from "./CollectionVisibilityUpdater";
import {TimestampStatic} from "../../external-lib/Firebase";
import {ItemEntity, legacyIdOrFallback} from "../item/ItemEntity";
import {itemPriceQuerier} from "../item/ItemPriceQuerier";
import {cardItemRetriever} from "../item/CardItemRetriever";
import {CardVariant} from "../card/CardEntity";
import {toCard} from "../item/CardItem";
import {collectionStatsUpdater} from "./CollectionStatsUpdater";


export const sumItems = (itemsToSum:Array<ItemEntity>):CurrencyAmountLike => {
  let sum = Zero(CurrencyCode.GBP);
  itemsToSum.forEach(item => {
    const itemPrice = itemPriceQuerier.pokePrice(item)?.price
    if (itemPrice && itemPrice.currencyCode === sum.currencyCode) {
      sum = sum.add(fromCurrencyAmountLike(itemPrice))
    }
  })
  return sum.toCurrencyAmountLike();
}

export const toStandardIdempotencyKey = (setId:string) => {
  return `${setId}|STANDARD`
}
export const toReverseHoloIdempotencyKey = (setId:string) => {
  return `${setId}|REVERSE_HOLO`
}
export const toPokeBallHoloIdempotencyKey = (setId:string) => {
  return `${setId}|POKE_BALL_HOLO`
}
export const toMasterBallHoloIdempotencyKey = (setId:string) => {
  return `${setId}|MASTER_BALL_HOLO`
}

const create = async (setId:string):Promise<Array<CardCollectionEntity>> => {
  const set = await setRetriever.retrieve(setId);
  const cards = await cardItemRetriever.retrieveBySetId(setId);

  const standardCards = new Array<ItemEntity>()
  const reverseHoloCards = new Array<ItemEntity>()
  const pokeBallHoloHoloCards = new Array<ItemEntity>()
  const masterBallHoloHoloCards = new Array<ItemEntity>()

  cards.forEach(card => {
    if (toCard(card)?.variant === CardVariant.REVERSE_HOLO) {
      reverseHoloCards.push(card)
      return
    }
    if (toCard(card)?.variant === CardVariant.POKE_BALL_HOLO) {
      pokeBallHoloHoloCards.push(card)
      return
    }
    if (toCard(card)?.variant === CardVariant.MASTER_BALL_HOLO) {
      masterBallHoloHoloCards.push(card)
      return
    }
    standardCards.push(card)
  })

  const priority = timestampToMoment(set.releaseDate).diff(moment('1995-01-01T00:00:00'), "days");


  const displayName = capitaliseKey(set.name.replace(/-jp$/gim, ''))
  const parentCollection = await cardCollectionCreator.create({
    visible: false,
    name: set.name,
    displayName,
    parentCollectionId: null,
    backgroundImageUrl: set.backgroundImageUrl,
    imageUrl: set.imageUrl,
    logoUrl: set.symbolUrl,
    region: set.region,
    idempotencyKey: set.id,
    priority: priority,
    cardIds: cards.map(card => legacyIdOrFallback(card)),
    visibleCardIds: [],
    stats: {
      count: 0,
      totalPrice: Zero(CurrencyCode.GBP).toCurrencyAmountLike(),
      visibleCount: 0,
      visibleTotalPrice: Zero(CurrencyCode.GBP).toCurrencyAmountLike(),
      lastUpdatedAt: TimestampStatic.now(),
    },
    statsV2: {
      count: 0,
      visibleCount: 0,
      lastUpdatedAt: TimestampStatic.now(),
      prices: [],
    },
  });

  const standardCollection = await cardCollectionCreator.create({
    visible: false,
    name: set.name + `-standard`,
    displayName,
    parentCollectionId: parentCollection.id,
    backgroundImageUrl: set.backgroundImageUrl,
    imageUrl: set.imageUrl,
    logoUrl: set.symbolUrl,
    idempotencyKey: toStandardIdempotencyKey(set.id),
    region: set.region,
    priority: priority,
    cardIds: standardCards.map(card => legacyIdOrFallback(card)),
    visibleCardIds: [],
    stats: {
      count: 0,
      totalPrice: Zero(CurrencyCode.GBP).toCurrencyAmountLike(),
      visibleCount: 0,
      visibleTotalPrice: Zero(CurrencyCode.GBP).toCurrencyAmountLike(),
      lastUpdatedAt: TimestampStatic.now(),
    },
    statsV2: {
      count: 0,
      visibleCount: 0,
      lastUpdatedAt: TimestampStatic.now(),
      prices: [],
    },
  });


  const results = [
    parentCollection,
    standardCollection,
  ]

  if (reverseHoloCards.length > 0) {
    const reverseHoloCollection = await cardCollectionCreator.create({
      visible: false,
      name: set.name + `-reverse-holo`,
      displayName,
      parentCollectionId: parentCollection.id,
      backgroundImageUrl: set.backgroundImageUrl,
      imageUrl: set.imageUrl,
      logoUrl: set.symbolUrl,
      idempotencyKey: toReverseHoloIdempotencyKey(set.id),
      region: set.region,
      priority: priority,
      cardIds: reverseHoloCards.map(card => legacyIdOrFallback(card)),
      visibleCardIds: [],
      stats: {
        count: 0,
        totalPrice: Zero(CurrencyCode.GBP).toCurrencyAmountLike(),
        visibleCount: 0,
        visibleTotalPrice: Zero(CurrencyCode.GBP).toCurrencyAmountLike(),
        lastUpdatedAt: TimestampStatic.now(),
      },
      statsV2: {
        count: 0,
        visibleCount: 0,
        lastUpdatedAt: TimestampStatic.now(),
        prices: [],
      },
    });
    results.push(reverseHoloCollection)
  }
  if (pokeBallHoloHoloCards.length > 0) {
    const pokeBallHoloCollection = await cardCollectionCreator.create({
      visible: false,
      name: set.name + `-poke-ball-holo`,
      displayName,
      parentCollectionId: parentCollection.id,
      backgroundImageUrl: set.backgroundImageUrl,
      imageUrl: set.imageUrl,
      logoUrl: set.symbolUrl,
      idempotencyKey: toPokeBallHoloIdempotencyKey(set.id),
      region: set.region,
      priority: priority,
      cardIds: pokeBallHoloHoloCards.map(card => legacyIdOrFallback(card)),
      visibleCardIds: [],
      stats: {
        count: 0,
        totalPrice: Zero(CurrencyCode.GBP).toCurrencyAmountLike(),
        visibleCount: 0,
        visibleTotalPrice: Zero(CurrencyCode.GBP).toCurrencyAmountLike(),
        lastUpdatedAt: TimestampStatic.now(),
      },
      statsV2: {
        count: 0,
        visibleCount: 0,
        lastUpdatedAt: TimestampStatic.now(),
        prices: [],
      },
    });
    results.push(pokeBallHoloCollection)
  }
  if (masterBallHoloHoloCards.length > 0) {
    const masterBallHoloCollection = await cardCollectionCreator.create({
      visible: false,
      name: set.name + `-master-ball-holo`,
      displayName,
      parentCollectionId: parentCollection.id,
      backgroundImageUrl: set.backgroundImageUrl,
      imageUrl: set.imageUrl,
      logoUrl: set.symbolUrl,
      idempotencyKey: toMasterBallHoloIdempotencyKey(set.id),
      region: set.region,
      priority: priority,
      cardIds: masterBallHoloHoloCards.map(card => legacyIdOrFallback(card)),
      visibleCardIds: [],
      stats: {
        count: 0,
        totalPrice: Zero(CurrencyCode.GBP).toCurrencyAmountLike(),
        visibleCount: 0,
        visibleTotalPrice: Zero(CurrencyCode.GBP).toCurrencyAmountLike(),
        lastUpdatedAt: TimestampStatic.now(),
      },
      statsV2: {
        count: 0,
        visibleCount: 0,
        lastUpdatedAt: TimestampStatic.now(),
        prices: [],
      },
    });
    results.push(masterBallHoloCollection)
  }

  await collectionStatsUpdater.update(parentCollection.id)
  return results;
}

export const setToCardCollectionCreator = {
  create,
}