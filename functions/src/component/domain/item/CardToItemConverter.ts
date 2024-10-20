import {Converter} from "../../database/DoubleWritingBaseCrudRepo";
import {CardEntity, PokePriceV2} from "../card/CardEntity";
import {ItemEntity, ItemPriceDetails, ItemPrices, PriceType, SingleCardItemDetails} from "./ItemEntity";
import {SINGLE_POKEMON_CARD_ITEM_TYPE} from "../marketplace/item-details/SinglePokemonCardItemDetails";
import {cardImageToImageMapper} from "./CardImageToImageMapper";
import {Create, Update} from "../../database/mongo/MongoEntity";
import {itemTagExtractor} from "./tag/ItemTagExtractor";
import {toTag} from "../search-tag/SearchTagEntity";
import moment from "moment";
import {searchKeywordGenerator} from "./search-keyword/SearchKeywordGenerator";

const convertItemPrices = (pokePrice:PokePriceV2|null):ItemPrices => {
  if (!pokePrice) {
    return {prices: []}
  }
  const prices:Array<ItemPriceDetails> = [];
  if (pokePrice.soldPrice) {
    prices.push({
      currencyCode: pokePrice.soldPrice.currencyCode,
      priceType: PriceType.SALE,
      currenciesUsed: [pokePrice.soldPrice.currencyCode],
      volume: pokePrice.soldVolume,
      periodSizeDays: pokePrice.soldPeriodSizeDays,
      minPrice: pokePrice.soldMinPrice,
      lowPrice: pokePrice.soldLowPrice,
      price: pokePrice.soldPrice,
      highPrice: pokePrice.soldHighPrice,
      maxPrice: pokePrice.soldMaxPrice,
      lastUpdatedAt: pokePrice?.soldLastUpdatedAt?.toDate() ?? null,
      mostRecentPrice: pokePrice?.soldMostRecentPrice?.toDate() ?? null,
      statIds: pokePrice.soldStatIds,
    })
  }
  if (pokePrice.listingPrice) {
    prices.push({
      currencyCode: pokePrice.listingPrice.currencyCode,
      priceType: PriceType.LISTING,
      currenciesUsed: [pokePrice.listingPrice.currencyCode],
      volume: pokePrice.listingVolume,
      periodSizeDays: pokePrice.listingPeriodSizeDays,
      minPrice: pokePrice.listingMinPrice,
      lowPrice: pokePrice.listingLowPrice,
      price: pokePrice.listingPrice,
      highPrice: pokePrice.listingHighPrice,
      maxPrice: pokePrice.listingMaxPrice,
      lastUpdatedAt: pokePrice?.listingLastUpdatedAt?.toDate() ?? null,
      mostRecentPrice: pokePrice?.listingMostRecentPrice?.toDate() ?? null,
      statIds: pokePrice.listingStatIds,
    })
  }
  return {prices};
}

const converter:Converter<CardEntity, ItemEntity> = {
  convertCreate: create => {
    const itemDetails:SingleCardItemDetails = {
      setId: create.setId,
      series: create.series,
      set: create.set,
      setCode: `${create.series}|${create.set}`,
      cardNumber: create.numberInSet,
      variant: create.variant,
      setNumber: create.displaySetNumber,
      superType: create.superType,
      subTypes: create.subTypes,
      energyTypes: create.types,
      pokemon: create.pokemon,
      rarity: create.rarity,
      artist: create.artist,
      flavourText: create.flavourText,
      setDetails: {
        setId: create.setId,
        name: create.setDetails.name,
        backgroundImageUrl: create.setDetails.backgroundImageUrl,
        imageUrl: create.setDetails.imageUrl,
        symbolUrl: create.setDetails.symbolUrl,
        releaseDate: create.setDetails.releaseDate.toDate(),
      },
    }

    const mongoCreate:Create<ItemEntity> = {
      slug: create.slug,
      slugs: create.slugs,
      slugSuffixId: null,
      visible: create.visible,
      name: create.name,
      displayName: create.displayName,
      description: null,
      searchKeywords: create.searchKeywords,
      identifiers: {},
      itemType: SINGLE_POKEMON_CARD_ITEM_TYPE,
      itemDetails,
      nextPokePriceCalculationTime: create.nextPokePriceCalculationTime?.toDate() ?? moment().add(1, 'day').toDate(),
      nextStatsCalculationTime: create.nextStatsCalculationTime?.toDate() ?? moment().add(1, 'day').toDate(),
      nextEbayOpenListingSourcingTime: create.nextEbayOpenListingSourcingTime?.toDate() ?? moment().add(1, 'day').toDate(),
      images: {images: [cardImageToImageMapper.map(create.image)]},
      itemPrices: convertItemPrices(create.pokePriceV2),
      pokePrices: [],
      sort: {name: create.name, ukPrice: null, ukSales: null, usPrice: null, usSales: null},
      tags: [],
      searchTags: [],
      nextItem: create.nextCard,
      previousItem: create.previousCard,
      relatedItems: create.relatedCards,
      metadata: {
        externalIdentifiers: create.externalIdentifiers,
      },
    }
    const searchKeywords = searchKeywordGenerator.generate(mongoCreate)
    mongoCreate.searchKeywords = searchKeywords
    const searchTags = itemTagExtractor.extract(mongoCreate);
    const tags = searchTags.map(toTag);
    mongoCreate.searchTags = searchTags;
    mongoCreate.tags = tags;
    return mongoCreate;
  },
  convertUpdate: update => {

    const mongoUpdate:Update<ItemEntity> = {}

    if (update.setId) {
      // @ts-ignore
      mongoUpdate['itemDetails.setId'] = update.setId
    }
    if (update.series) {
      // @ts-ignore
      mongoUpdate['itemDetails.series'] = update.series
    }
    if (update.set) {
      // @ts-ignore
      mongoUpdate['itemDetails.set'] = update.set
    }
    if (update.numberInSet) {
      // @ts-ignore
      mongoUpdate['itemDetails.cardNumber'] = update.numberInSet
    }
    if (update.variant) {
      // @ts-ignore
      mongoUpdate['itemDetails.variant'] = update.variant
    }
    if (update.displaySetNumber) {
      // @ts-ignore
      mongoUpdate['itemDetails.setNumber'] = update.displaySetNumber
    }
    if (update.superType) {
      // @ts-ignore
      mongoUpdate['itemDetails.superType'] = update.superType
    }
    if (update.subTypes) {
      // @ts-ignore
      mongoUpdate['itemDetails.subTypes'] = update.subTypes
    }
    if (update.types) {
      // @ts-ignore
      mongoUpdate['itemDetails.energyTypes'] = update.types
    }
    if (update.pokemon) {
      // @ts-ignore
      mongoUpdate['itemDetails.pokemon'] = update.pokemon
    }
    if (update.rarity) {
      // @ts-ignore
      mongoUpdate['itemDetails.rarity'] = update.rarity
    }
    if (update.artist) {
      // @ts-ignore
      mongoUpdate['itemDetails.artist'] = update.artist
    }
    if (update.flavourText) {
      // @ts-ignore
      mongoUpdate['itemDetails.flavourText'] = update.flavourText
    }
    if (update.setDetails) {
      // @ts-ignore
      mongoUpdate['itemDetails.setDetails'] = update.setDetails
    }
    if (update.slug) {
      mongoUpdate['slug'] = update.slug
    }
    if (update.slugs) {
      mongoUpdate['slugs'] = update.slugs
    }
    if (update.visible) {
      mongoUpdate['visible'] = update.visible
    }
    if (update.slug) {
      mongoUpdate['slug'] = update.slug
    }
    if (update.slugs) {
      mongoUpdate['slugs'] = update.slugs
    }
    if (update.visible) {
      mongoUpdate['visible'] = update.visible
    }
    if (update.name) {
      mongoUpdate['name'] = update.name
    }
    if (update.displayName) {
      mongoUpdate['displayName'] = update.displayName
    }
    if (update.searchKeywords) {
      mongoUpdate['searchKeywords'] = update.searchKeywords
    }
    if (update.nextPokePriceCalculationTime) {
      mongoUpdate['nextPokePriceCalculationTime'] = update.nextPokePriceCalculationTime.toDate()
    }
    if (update.nextStatsCalculationTime) {
      mongoUpdate['nextStatsCalculationTime'] = update.nextStatsCalculationTime.toDate()
    }
    if (update.nextEbayOpenListingSourcingTime) {
      mongoUpdate['nextEbayOpenListingSourcingTime'] = update.nextEbayOpenListingSourcingTime.toDate()
    }
    if (update.image) {
      mongoUpdate['images'] = {images: [cardImageToImageMapper.map(update.image)]}
    }
    if (update.pokePriceV2) {
      mongoUpdate['itemPrices'] = convertItemPrices(update.pokePriceV2)
    }
    if (update.nextCard) {
      mongoUpdate['nextItem'] = update.nextCard
    }
    if (update.previousCard) {
      mongoUpdate['previousItem'] = update.previousCard
    }
    if (update.relatedCards) {
      mongoUpdate['relatedItems'] = update.relatedCards
    }
    if (update.externalIdentifiers) {
      // @ts-ignore
      mongoUpdate['metadata.externalIdentifiers'] = update.externalIdentifiers
    }

    return mongoUpdate;
  },
}

export const cardToItemConverter = converter;