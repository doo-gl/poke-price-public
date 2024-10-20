import {PokemonTcgCard} from "../../client/PokemonTcgApiClientV2";
import {CardVariant, ExternalIdentifiers, PokemonTcgApiCardExternalIdentifiers} from "../card/CardEntity";
import {convertToKey} from "../../tools/KeyConverter";
import {CardDataSource} from "../card/CardDataSource";
import {SetEntity} from "../set/SetEntity";
import {pokemonNameExtractor} from "./PokemonNameExtractor";
import {logger} from "firebase-functions";
import {ebaySearchParamRetriever} from "../ebay/search-param/EbayCardSearchParamRetriever";
import {searchKeywordCalculator} from "../ebay/search-param/SearchKeywordCalculator";
import {ebayCardSearchParamCreator} from "../ebay/search-param/EbayCardSearchParamCreator";
import {cardImageUploader} from "../card/CardImageUploader";
import moment from "moment/moment";
import {TimestampStatic} from "../../external-lib/Firebase";
import {ebaySearchParamUpdater} from "../ebay/search-param/EbayCardSearchParamUpdater";
import {cardItemRetriever} from "../item/CardItemRetriever";
import {ItemEntity, legacyIdOrFallback, SingleCardItemDetails} from "../item/ItemEntity";
import {toCard} from "../item/CardItem";
import {Create} from "../../database/mongo/MongoEntity";
import {itemUpserter} from "../item/ItemUpserter";
import {SINGLE_POKEMON_CARD_ITEM_TYPE} from "../marketplace/item-details/SinglePokemonCardItemDetails";
import {itemTagExtractor} from "../item/tag/ItemTagExtractor";
import {toTag} from "../search-tag/SearchTagEntity";
import {searchKeywordGenerator} from "../item/search-keyword/SearchKeywordGenerator";


const calculateCreateCard = (set:SetEntity, tcgCard:PokemonTcgCard):Create<ItemEntity> => {
  const seriesKey = set.series;
  const setKey = set.name;
  const name = convertToKey(tcgCard.name);
  const fullName = tcgCard.name;
  const artist = tcgCard.artist || null;
  const flavourText = tcgCard.flavorText || null;
  const numberInSet = tcgCard.number;
  const countInSet = set.totalCards;
  const rarityKey = tcgCard.rarity ? convertToKey(tcgCard.rarity) : null;
  const subtypes = tcgCard.subtypes ? tcgCard.subtypes.map(subType => convertToKey(subType)) : [];
  const superType = convertToKey(tcgCard.supertype);
  const types = tcgCard.types ? tcgCard.types.map(type => convertToKey(type)) : [];
  const externalIdentifier:PokemonTcgApiCardExternalIdentifiers = {
    id: tcgCard.id,
    // @ts-ignore
    setCode: set.externalIdentifiers.POKEMON_TCG_API ? set.externalIdentifiers.POKEMON_TCG_API.code : null,
    number: tcgCard.number,
    url: `https://api.pokemontcg.io/v2/cards/${tcgCard.id}`,
  };
  const externalIdentifiers:ExternalIdentifiers = {
    [CardDataSource.POKEMON_TCG_API]: externalIdentifier,
  };
  const pokemon = pokemonNameExtractor.extract(name);
  if (superType === 'pokémon' && pokemon.length === 0) {
    logger.error(`Failed to find name for pokemon on card: ${name}`);
  }

  const itemDetails:SingleCardItemDetails = {
    series: set.series,
    set: set.name,
    setId: set.id,
    setCode: `${set.series}|${set.name}`,
    cardNumber: numberInSet.toLowerCase(),
    variant: CardVariant.DEFAULT,
    setNumber: set.displaySetNumber,
    superType: superType,
    subTypes: subtypes,
    energyTypes: types,
    pokemon,
    rarity: rarityKey,
    artist: artist,
    flavourText: flavourText,
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
    name: name,
    displayName: fullName,
    description: null,
    searchKeywords: { includes: [], excludes: [], ignores: [] },
    identifiers: {},
    itemType: SINGLE_POKEMON_CARD_ITEM_TYPE,
    itemDetails,
    nextPokePriceCalculationTime: moment().add(8, 'hour').toDate(),
    nextStatsCalculationTime: moment().add(4, 'hour').toDate(),
    nextEbayOpenListingSourcingTime: moment().add(1, 'hour').toDate(),
    images: {images: []},
    itemPrices: {prices: []},
    pokePrices: [],
    sort: {name: name, ukPrice: null, ukSales: null, usPrice: null, usSales: null},
    tags: [],
    searchTags: [],
    nextItem: null,
    previousItem: null,
    relatedItems: {itemIds: [], items:[]},
    metadata: {
      externalIdentifiers,
    },
  }
  const searchKeywords = searchKeywordGenerator.generate(mongoCreate)
  mongoCreate.searchKeywords = searchKeywords
  const searchTags = itemTagExtractor.extract(mongoCreate);
  const tags = searchTags.map(toTag);
  mongoCreate.searchTags = searchTags;
  mongoCreate.tags = tags;

  return mongoCreate;
}

const upsertSearchParams = async (createdCard:ItemEntity):Promise<void> => {
  const currentSearchParams = await ebaySearchParamRetriever.retrieveSearchParamsForCardId(legacyIdOrFallback(createdCard))
  const newSearchParams = await searchKeywordCalculator.calculate(legacyIdOrFallback(createdCard));
  const newSearchParamsExist = currentSearchParams.some(searchParams =>
    searchParams.includeKeywords.sort().join(',') === newSearchParams.includeKeywords.sort().join(',')
    && searchParams.excludeKeywords.sort().join(',') === newSearchParams.excludeKeywords.sort().join(',')
  )
  if (!newSearchParamsExist) {
    const createdParams = await ebayCardSearchParamCreator.createFromItemKeywords(legacyIdOrFallback(createdCard))
    await ebaySearchParamUpdater.update(createdParams.id, {backfillTime: TimestampStatic.now()})
  }
}

const upsertCard = async (set:SetEntity, tcgCard:PokemonTcgCard):Promise<ItemEntity> => {
  const preExistingCards = await cardItemRetriever.retrieveByPokemonTcgId(tcgCard.id);
  const preExistingCard = preExistingCards.find(card => toCard(card)?.variant === CardVariant.DEFAULT);
  const createCard = calculateCreateCard(set, tcgCard);

  const upsertedItem = await itemUpserter.upsert(createCard, preExistingCard ?? null)
  if (upsertedItem.images.images.length === 0) {
    try {
      await cardImageUploader.upload(upsertedItem._id, [tcgCard.images.large]);
    } catch (e:any) {
      logger.error(`Failed to upload image for card: ${upsertedItem._id.toString()}, ${e.message}`)
    }
  }
  await upsertSearchParams(upsertedItem)
  return upsertedItem
}

export const cardInfoSourcer = {
  upsertCard,
  upsertSearchParams,
}