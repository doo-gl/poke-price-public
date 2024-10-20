import {CardVariant} from "./CardEntity";
import {setRetriever} from "../set/SetRetriever";
import {convertToKey} from "../../tools/KeyConverter";
import {pokemonNameExtractor} from "../pokemon-tcg-api-v2/PokemonNameExtractor";
import {cardImageUploader} from "./CardImageUploader";
import {ebayCardSearchParamCreator} from "../ebay/search-param/EbayCardSearchParamCreator";
import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {ebaySearchParamRetriever} from "../ebay/search-param/EbayCardSearchParamRetriever";
import {searchKeywordCalculator} from "../ebay/search-param/SearchKeywordCalculator";
import moment from "moment/moment";
import {cardItemRetriever} from "../item/CardItemRetriever";
import {ItemEntity, languageOrFallback, SingleCardItemDetails} from "../item/ItemEntity";
import {Create} from "../../database/mongo/MongoEntity";
import {SINGLE_POKEMON_CARD_ITEM_TYPE} from "../marketplace/item-details/SinglePokemonCardItemDetails";
import {cardImageToImageMapper} from "../item/CardImageToImageMapper";
import {itemTagExtractor} from "../item/tag/ItemTagExtractor";
import {toTag} from "../search-tag/SearchTagEntity";
import {itemUpserter} from "../item/ItemUpserter";
import {searchKeywordGenerator} from "../item/search-keyword/SearchKeywordGenerator";

export interface CardCreateRequest {
  setId:string,
  cardName:string,
  cardNumber:string,
  superType:string,
  subTypes:Array<string>,
  types:Array<string>,
  rarity:string|null,
  imageUrl:string,
  artist:string|null,
  flavourText:string|null,
  variant:CardVariant,
}

const ALLOWED_RARITIES:Array<string> = [
  'amazing-rare',
  'classic-collection',
  'common',
  'uncommon',
  'legend',
  'promo',
  'rare',
  'rare-ace',
  'rare-break',
  'rare-holo',
  'rare-holo-ex',
  'rare-holo-gx',
  'rare-holo-lv-x',
  'rare-holo-star',
  'rare-holo-v',
  'rare-holo-vmax',
  'rare-prime',
  'rare-prism-star',
  'rare-rainbow',
  'rare-secret',
  'rare-shining',
  'rare-shiny',
  'rare-shiny-gx',
  'rare-ultra',
  'rare-uncommon',
]

const ALLOWED_SUPER_TYPES:Array<string> = [
  'energy',
  'trainer',
  'pokémon',
]

const ALLOWED_TYPES:Array<string> = [
  'colorless',
  'darkness',
  'dragon',
  'fairy',
  'fighting',
  'fire',
  'grass',
  'lightning',
  'metal',
  'psychic',
  'water',
]

const ALLOWED_SUB_TYPES:Array<string> = [
  'baby',
  'basic',
  'break',
  'ex',
  'goldenrod-game-corner',
  'gx',
  'item',
  'legend',
  'level-up',
  'mega',
  'pokémon-tool',
  'pokémon-tool-f',
  'rapid-strike',
  'restored',
  'rockets-secret-machine',
  'single-strike',
  'special',
  'stadium',
  'stage-1',
  'stage-2',
  'supporter',
  'tag-team',
  'technical-machine',
  'v',
  'vmax',
]

const isInAllowedValues = (value:string, allowedValues:Array<string>) => {
  return allowedValues.some(v => v === value)
}

const validateSuperType = (request:CardCreateRequest) => {
  if (!request.superType) {
    throw new InvalidArgumentError(`No Super Type given`)
  }
  const isAllowed = isInAllowedValues(request.superType, ALLOWED_SUPER_TYPES);
  if (!isAllowed) {
    throw new InvalidArgumentError(`Super Type: ${request.superType}, not in allowed values: ${ALLOWED_SUPER_TYPES.join(', ')}`)
  }
}

const validateTypes = (request:CardCreateRequest) => {
  request.types.forEach(type => {
    const isAllowed = isInAllowedValues(type, ALLOWED_TYPES);
    if (!isAllowed) {
      throw new InvalidArgumentError(`Energy Type: ${type}, not in allowed values: ${ALLOWED_TYPES.join(', ')}`)
    }
  })
}

const validateSubTypes = (request:CardCreateRequest) => {
  request.subTypes.forEach(type => {
    const isAllowed = isInAllowedValues(type, ALLOWED_SUB_TYPES);
    if (!isAllowed) {
      throw new InvalidArgumentError(`Sub Type: ${type}, not in allowed values: ${ALLOWED_SUB_TYPES.join(', ')}`)
    }
  })
}

const validateRarity = (request:CardCreateRequest) => {
  if (request.rarity === null) {
    return;
  }
  const isAllowed = isInAllowedValues(request.rarity, ALLOWED_RARITIES);
  if (!isAllowed) {
    throw new InvalidArgumentError(`Rarity: ${request.rarity}, not in allowed values: ${ALLOWED_RARITIES.join(', ')}`)
  }
}

const calculateCreateDetails = async (request:CardCreateRequest):Promise<Create<ItemEntity>> => {
  const set = await setRetriever.retrieve(request.setId)
  const pokemon = pokemonNameExtractor.extract(convertToKey(request.cardName))

  const itemDetails:SingleCardItemDetails = {
    series: set.series,
    set: set.name,
    setId: set.id,
    setCode: `${set.series}|${set.name}`,
    cardNumber: request.cardNumber,
    variant: request.variant,
    setNumber: set.displaySetNumber,
    superType: request.superType,
    subTypes: request.subTypes,
    energyTypes: request.types,
    pokemon,
    rarity: request.rarity,
    artist: request.artist,
    flavourText: request.flavourText,
    setDetails: {
      name: set.name,
      setId: set.id,
      backgroundImageUrl: set.backgroundImageUrl,
      imageUrl: set.imageUrl,
      symbolUrl: set.symbolUrl,
      releaseDate: set.releaseDate.toDate(),
    },
  }
  const mongoCreate:Create<ItemEntity> = {
    slug: null,
    slugs: [],
    slugSuffixId: null,
    visible: false,
    name: convertToKey(request.cardName),
    displayName: request.cardName,
    description: null,
    searchKeywords: { includes: [], excludes: [], ignores: [] },
    identifiers: {},
    itemType: SINGLE_POKEMON_CARD_ITEM_TYPE,
    itemDetails,
    nextPokePriceCalculationTime: moment().toDate(),
    nextStatsCalculationTime: moment().toDate(),
    nextEbayOpenListingSourcingTime: moment().toDate(),
    images: {images: [cardImageToImageMapper.map({url: request.imageUrl, hiResUrl: request.imageUrl})]},
    itemPrices: {prices: []},
    pokePrices: [],
    sort: {name: convertToKey(request.cardName), ukPrice: null, ukSales: null, usPrice: null, usSales: null},
    tags: [],
    searchTags: [],
    nextItem: null,
    previousItem: null,
    relatedItems: {itemIds: [], items:[]},
    metadata: {
      externalIdentifiers: {},
    },
  }
  const searchKeywords = searchKeywordGenerator.generate(mongoCreate)
  mongoCreate.searchKeywords = searchKeywords
  const searchTags = itemTagExtractor.extract(mongoCreate);
  const tags = searchTags.map(toTag);
  mongoCreate.searchTags = searchTags;
  mongoCreate.tags = tags;

  return mongoCreate
}

const upsertSearchParams = async (createdCard:ItemEntity):Promise<void> => {
  const cardId = createdCard.legacyId ?? createdCard._id.toString()
  const currentSearchParams = await ebaySearchParamRetriever.retrieveSearchParamsForCardId(cardId)
  const newSearchParams = await searchKeywordCalculator.calculate(cardId);
  const newSearchParamsExist = currentSearchParams.some(searchParams =>
    searchParams.includeKeywords.sort().join(',') === newSearchParams.includeKeywords.sort().join(',')
    && searchParams.excludeKeywords.sort().join(',') === newSearchParams.excludeKeywords.sort().join(',')
  )
  if (!newSearchParamsExist) {
    await ebayCardSearchParamCreator.createFromItemKeywords(cardId)
  }
}

const create = async (request:CardCreateRequest):Promise<ItemEntity> => {
  validateSuperType(request)
  validateSubTypes(request)
  validateTypes(request)
  validateRarity(request)

  const createDetails = await calculateCreateDetails(request)
  const itemDetails = createDetails.itemDetails as SingleCardItemDetails
  const preExistingCard = await cardItemRetriever.retrieveOptionalByUniqueCard({
    series: itemDetails.series,
    set: itemDetails.set,
    numberInSet: itemDetails.cardNumber,
    variant: itemDetails.variant,
    language: languageOrFallback(itemDetails.language),
  })
  const createdCard = await itemUpserter.upsert(createDetails, preExistingCard);

  // upsert ebay search params
  await cardImageUploader.upload(createdCard._id, [request.imageUrl]);
  await upsertSearchParams(createdCard);

  return createdCard
}

export const adminCardCreator = {
  create,
}