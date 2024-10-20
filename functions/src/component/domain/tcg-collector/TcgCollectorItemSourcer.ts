import {CardLanguage, ItemEntity, languageOrFallback, SingleCardItemDetails} from "../item/ItemEntity";
import {CardPageParseResult, TcgCollectorCardType} from "./TcgCollectorCardPageParser";
import {Create} from "../../database/mongo/MongoEntity";
import {convertToKey} from "../../tools/KeyConverter";
import {CardVariant, ExternalIdentifiers, TcgCollectorCardExternalIdentifiers} from "../card/CardEntity";
import {CardDataSource} from "../card/CardDataSource";
import {pokemonNameExtractor} from "../pokemon-tcg-api-v2/PokemonNameExtractor";
import {logger} from "firebase-functions";
import {SINGLE_POKEMON_CARD_ITEM_TYPE} from "../marketplace/item-details/SinglePokemonCardItemDetails";
import moment from "moment/moment";
import {searchKeywordGenerator} from "../item/search-keyword/SearchKeywordGenerator";
import {itemTagExtractor} from "../item/tag/ItemTagExtractor";
import {toTag} from "../search-tag/SearchTagEntity";
import {SetEntity, TcgCollectorSetExternalIdentifiers} from "../set/SetEntity";
import {itemUpserter} from "../item/ItemUpserter";
import {cardImageUploader} from "../card/CardImageUploader";
import {cardInfoSourcer} from "../pokemon-tcg-api-v2/CardInfoSourcer";
import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {UnexpectedError} from "../../error/UnexpectedError";
import {cardItemRetriever} from "../item/CardItemRetriever";

interface TcgCollectorCardInfo {
  name:string,
  artist:string|null,
  cardNumber:string,
  cardSetNumber:string,
  rarity:string|null,
  subTypes:Array<string>,
  superType:string,
  energyTypes:Array<string>,
  tcgCollectorCardId:string,
}

const parseCardCode = (cardCode:string):{cardNumber:string, cardSetNumber:string} => {
  const noRegex = new RegExp('No\. ([\\d]+)', 'gim')
  const noRegexMatch = noRegex.exec(cardCode)
  if (noRegexMatch) {
    return {
      cardNumber: noRegexMatch[1],
      cardSetNumber: '',
    }
  }

  const regex = new RegExp('([^/]+)/([^/]+)', 'gim')
  const match = regex.exec(cardCode)
  if (!match || match.length !== 3) {
    throw new InvalidArgumentError(`Failed to parse card code: ${cardCode}`)
  }
  return {
    cardNumber: match[1],
    cardSetNumber: match[2],
  }
}

const parseRarity = (rarity:string):string|null => {
  if (
    rarity.trim().length === 0
    || !rarity.trim().match(/^[\w\d\s()]*$/gim)
  ) {
    return null
  }
  return rarity.replace(/\(.*\)/gim, '').trim()
}

const parseArtist = (artist:string):string|null => {
  if (
    artist.trim().length === 0
    || !artist.trim().match(/^[\w\d\s()\\.]*$/gim)
  ) {
    return null
  }
  return artist
}

const parseSuperType = (cardInfo:CardPageParseResult):string => {
  const isPokemon = cardInfo.types.some(
    type => !!type.match(/(pok(é|e)mon)|(beast)/gim)
      && !type.match(/(pok(é|e)mon tool)/gim)
  )
  if (isPokemon) {
    return 'pokémon'
  }
  const isEnergy = cardInfo.types.some(type => !!type.match(/energy/gim))
  if (isEnergy) {
    return 'energy'
  }
  return 'trainer'
}

const parseSubTypes = (cardInfo:CardPageParseResult):Array<string> => {
  const types = cardInfo.types
  const evolutionStatus = cardInfo.evolutionStatus

  const subTypes = new Array<string>()
  types.map(type => convertToKey(type)).forEach(type => subTypes.push(type))

  if (evolutionStatus && evolutionStatus.length > 0) {
    subTypes.push(convertToKey(evolutionStatus[0]))
  }

  return subTypes
}

const parseInfoFromCard = (cardInfo:CardPageParseResult):TcgCollectorCardInfo => {
  const name = cardInfo.name
  const artist = parseArtist(cardInfo.artist)
  const parsedCode = parseCardCode(cardInfo.cardCode)
  const cardNumber = parsedCode.cardNumber
  const cardSetNumber = parsedCode.cardSetNumber
  const rarity = parseRarity(cardInfo.rarity)
  const superType = parseSuperType(cardInfo)
  const subTypes = parseSubTypes(cardInfo)
  const energyTypes = cardInfo.energyTypes
  const tcgCollectorCardId = cardInfo.tcgCollectorCardId

  return {
    name,
    artist,
    cardNumber,
    cardSetNumber,
    rarity,
    superType,
    subTypes,
    energyTypes,
    tcgCollectorCardId,
  }
}

const parseVariants = (cardParseInfo:CardPageParseResult):Array<CardVariant> => {
  const variants = new Array<CardVariant>()
  cardParseInfo.cardTypes.forEach(cardType => {
    if (cardType === TcgCollectorCardType.NORMAL) {
      variants.push(CardVariant.DEFAULT)
    }
    if (cardType === TcgCollectorCardType.REVERSE_HOLO) {
      variants.push(CardVariant.REVERSE_HOLO)
    }
    if (cardType === TcgCollectorCardType.POKE_BALL_HOLO) {
      variants.push(CardVariant.POKE_BALL_HOLO)
    }
    if (cardType === TcgCollectorCardType.MASTER_BALL_HOLO) {
      variants.push(CardVariant.MASTER_BALL_HOLO)
    }
    if (cardType === TcgCollectorCardType.PROMO) {
      variants.push(CardVariant.DEFAULT)
    }
    if (cardType === TcgCollectorCardType.HOLO) {
      variants.push(CardVariant.DEFAULT)
    }
    if (cardType === TcgCollectorCardType.NORMAL_HOLO) {
      variants.push(CardVariant.DEFAULT)
    }
    if (cardType === TcgCollectorCardType.NORMAL_HOLO_JUMBO_SIZE) {
      variants.push(CardVariant.DEFAULT)
    }
    if (cardType === TcgCollectorCardType.JUMBO_SIZE) {
      variants.push(CardVariant.DEFAULT)
    }
    if (cardType === TcgCollectorCardType.FIRST_EDITION) {
      variants.push(CardVariant.FIRST_EDITION)
    }
  })
  return variants
}

const calculateCreates = (set:SetEntity, cardParseInfo:CardPageParseResult):Array<Create<ItemEntity>> => {
  const cardInfo = parseInfoFromCard(cardParseInfo)
  const seriesKey = set.series;
  const setKey = set.name;
  const name = convertToKey(cardInfo.name);
  const fullName = cardInfo.name;
  const artist = cardInfo.artist || null;
  const flavourText = null;
  const numberInSet = cardInfo.cardNumber;
  const countInSet = -1;
  const rarityKey = cardInfo.rarity ? convertToKey(cardInfo.rarity) : null;
  const subtypes = cardInfo.subTypes ? cardInfo.subTypes.map(subType => convertToKey(subType)) : [];
  const superType = convertToKey(cardInfo.superType);
  const types = cardInfo.energyTypes ? cardInfo.energyTypes.map(type => convertToKey(type)) : [];
  const variants = parseVariants(cardParseInfo)

  // @ts-ignore
  const setIdentifiers:TcgCollectorSetExternalIdentifiers|null = set.externalIdentifiers.TCG_COLLECTOR_WEBSITE ?? null;
  if (!setIdentifiers) {
    throw new UnexpectedError(`Set with id: ${set.id} does not have tcg collector identifiers`)
  }

  const externalIdentifier:TcgCollectorCardExternalIdentifiers = {
    id: cardParseInfo.tcgCollectorCardId,
    url: cardParseInfo.tcgCollectorCardUrl,
    expansionName: setIdentifiers.name,
    expansionRegion: setIdentifiers.region,
    expansionUrl: setIdentifiers.url,
  };
  const externalIdentifiers:ExternalIdentifiers = {
    [CardDataSource.TCG_COLLECTOR_WEBSITE]: externalIdentifier,
  };
  const pokemon = pokemonNameExtractor.extract(name);
  if (superType === 'pokémon' && pokemon.length === 0) {
    logger.error(`Failed to find name for pokemon on card: ${name}`);
  }

  return variants.map(variant => {

    const itemDetails:SingleCardItemDetails = {
      series: set.series,
      set: set.name,
      setId: set.id,
      setCode: `${set.series}|${set.name}`,
      cardNumber: numberInSet.toLowerCase(),
      variant,
      setNumber: cardInfo.cardSetNumber,
      superType: superType,
      subTypes: subtypes,
      energyTypes: types,
      pokemon,
      rarity: rarityKey,
      artist: artist,
      flavourText: flavourText,
      language: setIdentifiers.region === "jp" ? CardLanguage.JAPANESE : CardLanguage.ENGLISH,
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
  })
}

const findPreExistingCard = async (create:Create<ItemEntity>):Promise<ItemEntity|null> => {
  if (create.itemType !== SINGLE_POKEMON_CARD_ITEM_TYPE) {
    throw new UnexpectedError(`Create item is not of type ${SINGLE_POKEMON_CARD_ITEM_TYPE}`)
  }
  const card = create.itemDetails as SingleCardItemDetails
  const item = await cardItemRetriever.retrieveOptionalByUniqueCard({
    series: card.series,
    set: card.set,
    numberInSet: card.cardNumber,
    variant: card.variant,
    language: languageOrFallback(card.language),
  })
  return item
}

const upsertItem = async (set:SetEntity, cardParseInfo:CardPageParseResult):Promise<Array<ItemEntity>> => {
  const createCards = calculateCreates(set, cardParseInfo);

  const upsertedItems = new Array<ItemEntity>()

  for (let cardIndex = 0; cardIndex < createCards.length; cardIndex++) {
    const createCard = createCards[cardIndex]
    const preExistingCard = await findPreExistingCard(createCard)
    const upsertedItem = await itemUpserter.upsert(createCard, preExistingCard ?? null)
    upsertedItems.push(upsertedItem)
    if (upsertedItem.images.images.length === 0) {
      try {
        await cardImageUploader.upload(upsertedItem._id, [cardParseInfo.imageUrl]);
      } catch (e:any) {
        logger.error(`Failed to upload image for card: ${upsertedItem._id.toString()}, ${e.message}`)
      }
    }
    await cardInfoSourcer.upsertSearchParams(upsertedItem)
  }

  return upsertedItems
}


export const tcgCollectorItemSourcer = {
  upsertItem,
}