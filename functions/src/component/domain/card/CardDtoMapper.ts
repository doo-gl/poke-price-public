import {CardEntity, ExternalIdentifiers, PokePriceV2} from "./CardEntity";
import {CardCsvDto, CardDto, PokePriceDtoV2} from "./CardDto";
import {timestampToMoment} from "../../tools/TimeConverter";
import {lodash} from "../../external-lib/Lodash";
import {PublicCardDto, SetDetailsDto, UserCardDto} from "./PublicCardDto";
import {entityDtoMapper} from "../EntityDtoMapper";
import {cardContentMapperV2} from "./CardContentMapperV2";
import {Zero} from "../money/CurrencyAmount";
import {CurrencyCode} from "../money/CurrencyCodes";
import {capitaliseKey} from "../../tools/KeyConverter";
import {cardRater} from "./CardRater";
import {CardLanguage, ItemEntity, ItemPrices, PriceType, SetDetails, SingleCardItemDetails} from "../item/ItemEntity";
import {SINGLE_POKEMON_CARD_ITEM_TYPE} from "../marketplace/item-details/SinglePokemonCardItemDetails";
import moment from "moment/moment";
import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {itemPriceQuerier} from "../item/ItemPriceQuerier";
import {cardImageToImageMapper} from "../item/CardImageToImageMapper";
import {toTag} from "../search-tag/SearchTagEntity";


const mapExternalIdentifiers = (externalIdentifiers:ExternalIdentifiers):ExternalIdentifiers => {
  const result:ExternalIdentifiers = lodash.cloneDeep(externalIdentifiers);
  // in this instance, no mapping required, but at some point we are going to want to avoid exposing all the info
  return result;
}

const mapItemPricesToPokePriceV2 = (itemPrices:ItemPrices):PokePriceDtoV2|null => {
  const soldDetails = itemPriceQuerier.query(CurrencyCode.GBP, PriceType.SALE, itemPrices);
  const listingDetails = itemPriceQuerier.query(CurrencyCode.GBP, PriceType.LISTING, itemPrices);
  if (!soldDetails && !listingDetails) {
    return null;
  }
  return {
    soldVolume: soldDetails?.volume ?? null,
    soldMinPrice: soldDetails?.minPrice ?? null,
    soldLowPrice: soldDetails?.lowPrice ?? null,
    soldPrice: soldDetails?.price ?? null,
    soldHighPrice: soldDetails?.highPrice ?? null,
    soldMaxPrice: soldDetails?.maxPrice ?? null,
    soldLastUpdatedAt: soldDetails?.lastUpdatedAt?.toISOString() ?? null,
    soldMostRecentPrice: soldDetails?.mostRecentPrice?.toISOString() ?? null,
    soldStatIds: soldDetails?.statIds ?? null,

    listingVolume: listingDetails?.volume ?? null,
    listingMinPrice: listingDetails?.minPrice ?? null,
    listingLowPrice: listingDetails?.lowPrice ?? null,
    listingPrice: listingDetails?.price ?? null,
    listingHighPrice: listingDetails?.highPrice ?? null,
    listingMaxPrice: listingDetails?.maxPrice ?? null,
    listingLastUpdatedAt: listingDetails?.lastUpdatedAt?.toISOString() ?? null,
    listingMostRecentPrice: listingDetails?.mostRecentPrice?.toISOString() ?? null,
    listingStatIds: listingDetails?.statIds ?? null,
  }
}

const mapPokePriceV2 = (pokePriceV2:PokePriceV2|null):PokePriceDtoV2|null => {
  if (!pokePriceV2) {
    return null
  }
  return {
    soldVolume: pokePriceV2.soldVolume,
    soldMinPrice: pokePriceV2.soldMinPrice,
    soldLowPrice: pokePriceV2.soldLowPrice,
    soldPrice: pokePriceV2.soldPrice,
    soldHighPrice: pokePriceV2.soldHighPrice,
    soldMaxPrice: pokePriceV2.soldMaxPrice,
    soldLastUpdatedAt: pokePriceV2.soldLastUpdatedAt ? timestampToMoment(pokePriceV2.soldLastUpdatedAt).toISOString() : null,
    soldMostRecentPrice: pokePriceV2.soldMostRecentPrice ? timestampToMoment(pokePriceV2.soldMostRecentPrice).toISOString() : null,
    soldStatIds: pokePriceV2.soldStatIds,

    listingVolume: pokePriceV2.listingVolume,
    listingMinPrice: pokePriceV2.listingMinPrice,
    listingLowPrice: pokePriceV2.listingLowPrice,
    listingPrice: pokePriceV2.listingPrice,
    listingHighPrice: pokePriceV2.listingHighPrice,
    listingMaxPrice: pokePriceV2.listingMaxPrice,
    listingLastUpdatedAt: pokePriceV2.listingLastUpdatedAt ? timestampToMoment(pokePriceV2.listingLastUpdatedAt).toISOString() : null,
    listingMostRecentPrice: pokePriceV2.listingMostRecentPrice ? timestampToMoment(pokePriceV2.listingMostRecentPrice).toISOString() : null,
    listingStatIds: pokePriceV2.listingStatIds,
  }
}

const mapSetDetails = (details:SetDetails):SetDetailsDto => {
  return {
    name: details.name,
    releaseDate: details.releaseDate.toISOString(),
    setId: details.setId,
    imageUrl: details.imageUrl,
    symbolUrl: details.symbolUrl,
    backgroundImageUrl: details.backgroundImageUrl,
  }
}

const map = (cardEntity:CardEntity):CardDto => {
  return {
    ...entityDtoMapper.map(cardEntity),
    series: cardEntity.series,
    set: cardEntity.set,
    setId: cardEntity.setId,
    name: cardEntity.name,
    numberInSet: cardEntity.numberInSet,
    variant: cardEntity.variant,
    language: CardLanguage.ENGLISH,
    countInSet: cardEntity.countInSet,
    displaySetNumber: cardEntity.displaySetNumber,
    tags: Object.values(cardEntity.queryTags).sort(),
    externalIdentifiers: mapExternalIdentifiers(cardEntity.externalIdentifiers),
    image: cardEntity.image,
    rarity: cardEntity.rarity,
    superType: cardEntity.superType,
    subTypes: cardEntity.subTypes,
    pokePrice: cardEntity.pokePrice,
    artist: cardEntity.artist,
    flavourText: cardEntity.flavourText,
    fullName: cardEntity.fullName,
    displayName: cardEntity.displayName,
    types: cardEntity.types,
    pokemon: cardEntity.pokemon,
    visible: cardEntity.visible,
    mostRecentEbayOpenListingSourcing: timestampToMoment(cardEntity.mostRecentEbayOpenListingSourcing).toISOString(),
    mostRecentStatCalculation: timestampToMoment(cardEntity.mostRecentStatCalculation).toISOString(),
    priority: cardEntity.priority,
    listingUrl: cardEntity.listingUrl,
    soldUrl: cardEntity.soldUrl,
    nextPokePriceCalculationTime: timestampToMoment(cardEntity.nextPokePriceCalculationTime).toISOString(),
    searchKeywords: cardEntity.searchKeywords,
    pokePriceV2: mapPokePriceV2(cardEntity.pokePriceV2),
  }
}

const mapItem = (item:ItemEntity):CardDto => {
  if (item.itemType !== SINGLE_POKEMON_CARD_ITEM_TYPE || !item.itemDetails) {
    throw new InvalidArgumentError(`Item: ${item._id.toString()} is not a card`)
  }
  const itemDetails = item.itemDetails as SingleCardItemDetails;
  return {
    id: item.legacyId ?? item._id.toString(),
    dateCreated: moment(item.dateCreated),
    dateLastModified: moment(item.dateLastModified),
    series: itemDetails.series,
    set: itemDetails.set,
    setId: itemDetails.setId,
    name: item.name,
    language: CardLanguage.ENGLISH,
    numberInSet: itemDetails.cardNumber,
    variant: itemDetails.variant,
    countInSet: 0,
    displaySetNumber: itemDetails.setNumber,
    tags: [],
    externalIdentifiers: item.metadata.externalIdentifiers,
    image: {url: item.images.images[0].variants[0].url, hiResUrl: item.images.images[0].variants[0].url},
    rarity: itemDetails.rarity,
    superType: itemDetails.superType,
    subTypes: itemDetails.subTypes,
    pokePrice: null,
    artist: itemDetails.artist,
    flavourText: itemDetails.flavourText,
    fullName: item.displayName,
    displayName: item.displayName,
    types: itemDetails.energyTypes,
    pokemon: itemDetails.pokemon,
    visible: item.visible,
    mostRecentEbayOpenListingSourcing: new Date(0).toISOString(),
    mostRecentStatCalculation: new Date(0).toISOString(),
    priority: 0,
    listingUrl: '',
    soldUrl: '',
    nextPokePriceCalculationTime: item.nextPokePriceCalculationTime.toISOString(),
    searchKeywords: item.searchKeywords,
    pokePriceV2: mapItemPricesToPokePriceV2(item.itemPrices),
  }
}

const mapPublicItem = (item:ItemEntity):PublicCardDto|null => {
  if (!item.visible) {
    return null;
  }
  if (item.itemType !== SINGLE_POKEMON_CARD_ITEM_TYPE) {
    return null
  }
  const itemDetails = item.itemDetails as SingleCardItemDetails;
  const soldDetails = itemPriceQuerier.query(CurrencyCode.GBP, PriceType.SALE, item.itemPrices)
  const listingDetails = itemPriceQuerier.query(CurrencyCode.GBP, PriceType.LISTING, item.itemPrices)
  return {
    cardId: item.legacyId ?? item._id.toString(),
    setId: itemDetails.setId,
    series: itemDetails.series,
    set: itemDetails.set,
    numberInSet: itemDetails.cardNumber,
    variant: itemDetails.variant,
    countInSet: 0,
    displaySetNumber: itemDetails.setNumber,
    name: item.name,
    language: CardLanguage.ENGLISH,
    displayName: item.displayName,
    image: cardImageToImageMapper.reverseMap(item.images.images[0]),
    imageOverlays: [],
    rarity: itemDetails.rarity,
    subType: itemDetails.subTypes.length > 0 ? itemDetails.subTypes[0] : '',
    superType: itemDetails.superType,
    ebaySearchLink: '',
    pokePrice: Zero(CurrencyCode.GBP).toCurrencyAmountLike(),
    numberOfSales: null,
    availableFromPrice: null,
    pricesUpdatedAt: null,
    hasSoldListingUrl: false,
    hasOpenListingUrl: false,
    cardDescription: [],
    content: {description: []},

    setDisplayName: capitaliseKey(itemDetails.set),

    pokePriceV2: soldDetails?.price ?? null,
    availableFromPriceV2: listingDetails?.minPrice ?? null,
    highListingPriceV2: listingDetails?.highPrice ?? null,
    numberOfSalesV2: soldDetails?.volume ?? null,
    numberOfListingsV2: listingDetails?.volume ?? null,
    pricesUpdatedAtV2: soldDetails?.lastUpdatedAt?.toISOString() ?? null,
    contentV2: cardContentMapperV2.map(item, itemDetails),
    rating: cardRater.rate(item),

    slug: item.slug,
    previousCard: item.previousItem ?? null,
    nextCard: item.nextItem ?? null,
    relatedCards: item.relatedItems ?? null,
    tags: [],
    tagsV2: item.searchTags.filter(searchTag => !!searchTag.public).map(toTag),
    setDetails: mapSetDetails(itemDetails.setDetails),
  }
}

const mapCsv = (card:CardEntity):CardCsvDto => {
  return {
    id: card.id,
    dateCreated: timestampToMoment(card.dateCreated).toISOString(),
    dateLastModified: timestampToMoment(card.dateLastModified).toISOString(),
    series: card.series,
    set: card.set,
    setId: card.setId,
    name: card.name,
    fullName: card.fullName || '',
    numberInSet: card.numberInSet,
    displaySetNumber: card.displaySetNumber,
    subTypes: card.subTypes ? card.subTypes.join('|') : '',
    superType: card.superType,
    rarity: card.rarity,
    image: card.image.url,
    openListingUrl: card.pokePrice && card.pokePrice.openListingUrl ? card.pokePrice.openListingUrl : null,
    visible: card.visible,
    variant: card.variant,
    isUrlReviewed: card.isUrlReviewed,
    includes: card.searchKeywords.includes.join('|'),
    excludes: card.searchKeywords.excludes.join('|'),
    ignores: card.searchKeywords.ignores.join('|'),
    displayName: card.displayName,
  }
}

const mapUser = (card:ItemEntity):UserCardDto|null => {
  const publicCardDto = mapPublicItem(card);
  if (!publicCardDto) {
    return null;
  }
  return {
    ...publicCardDto,
    ebayOpenListingUrl: '',
    ebaySoldListingUrl: '',
  }
}

export const cardDtoMapper = {
  map,
  mapItem,
  mapCsv,
  mapPublic: mapPublicItem,
  mapUser,
}