import {CardEntity, CardVariant} from "../CardEntity";
import {Query} from "../../../database/BaseCrudRepository";
import {CardRequest} from "../PublicCardDtoRetrieverV2";
import {convertToKey} from "../../../tools/KeyConverter";
import {
  ListingPriceValueTag,
  ListingVolumeValueTag,
  SoldPriceValueTag,
  SoldVolumeValueTag, SupplyVsDemandValueTag, TotalCirculationValueTag,
  valueTagExtractor, VolatilityValueTag,
} from "./ValueTagExtractor";

export interface CardTags {
  series:string,
  set:string,
  number:string,
  setNumber:string,
  variant:CardVariant,

  name?:string,
  rarity?:string,
  superType?:string,
  artist?:string,

  pokemon?:Array<string>,
  subTypes?:Array<string>,
  energyTypes?:Array<string>,

  soldPrice?:SoldPriceValueTag,
  listingPrice?:ListingPriceValueTag,
  soldVolume?:SoldVolumeValueTag,
  listingVolume?:ListingVolumeValueTag,
  totalCirculation?:TotalCirculationValueTag,
  supplyVsDemand?:SupplyVsDemandValueTag,
  volatility?:VolatilityValueTag,
}

const calculateQueryTags = (card:CardEntity):CardTags => {
  const series = card.series;
  const set = card.set;
  const name = convertToKey(card.displayName);
  const number = card.numberInSet.toLowerCase();
  const setNumber = card.displaySetNumber.toLowerCase();
  const rarity = card.rarity;
  const artist = card.artist ? convertToKey(card.artist) : null;
  const superType = card.superType;
  const variant = card.variant;
  const pokemon = card.pokemon ?? [];
  const energyTypes = card.types;
  const subTypes = card.subTypes ?? [];
  const valueTags = valueTagExtractor.extract(card)

  const cardTags:CardTags = {
    series,
    set,
    number,
    setNumber,
    variant,
    ...valueTags,
  };
  if (name && name.trim().length > 0) {
    cardTags.name = name;
  }
  if (rarity && rarity.trim().length > 0) {
    cardTags.rarity = rarity;
  }
  if (superType && superType.trim().length > 0) {
    cardTags.superType = superType;
  }
  if (artist && artist.trim().length > 0) {
    cardTags.artist = artist;
  }
  if (pokemon && pokemon.length > 0) {
    cardTags.pokemon = pokemon;
  }
  if (energyTypes && energyTypes.length > 0) {
    cardTags.energyTypes = energyTypes;
  }
  if (subTypes && subTypes.length > 0) {
    cardTags.subTypes = subTypes;
  }
  return cardTags;
}

const calculateQueryDetails = (card:CardEntity):{[name:string]:string} => {
  const cardTags = calculateQueryTags(card);
  const queryDetails:{[key:string]:string} = {

  }
  Object.entries(cardTags).forEach(entry => {
    const key = entry[0];
    const value = entry[1];
    if (typeof value === 'string') {
      queryDetails[key] = value;
    } else if (Array.isArray(value)) {
      value.forEach(val => {
        queryDetails[val] = val;
      })
    }
  })
  return queryDetails;
}

const buildQueries = (request:CardRequest):Array<Query<CardEntity>> => {
  const queries:Array<Query<CardEntity>> = [];
  if (request.series) {
    queries.push({ field: 'queryDetails.series', operation: "==", value: request.series })
  }
  if (request.set) {
    queries.push({ field: 'queryDetails.set', operation: "==", value: request.set })
  }
  if (request.name) {
    queries.push({ field: 'queryDetails.name', operation: "==", value: request.name })
  }
  if (request.number) {
    queries.push({ field: 'queryDetails.number', operation: "==", value: request.number })
  }
  if (request.setNumber) {
    queries.push({ field: 'queryDetails.setNumber', operation: "==", value: request.setNumber })
  }
  if (request.rarity) {
    queries.push({ field: 'queryDetails.rarity', operation: "==", value: request.rarity })
  }
  if (request.superType) {
    queries.push({ field: 'queryDetails.superType', operation: "==", value: request.superType })
  }
  if (request.artist) {
    queries.push({ field: 'queryDetails.artist', operation: "==", value: request.artist })
  }
  if (request.variant) {
    queries.push({ field: 'queryDetails.variant', operation: "==", value: request.variant })
  }
  if (request.pokemon) {
    request.pokemon.forEach(pokemon => {
      queries.push({ field: `queryDetails.${pokemon}`, operation: "==", value: pokemon })
    })
  }
  if (request.energyType) {
    request.energyType.forEach(energyType => {
      queries.push({ field: `queryDetails.${energyType}`, operation: "==", value: energyType })
    })
  }
  if (request.subType) {
    request.subType.forEach(subType => {
      queries.push({ field: `queryDetails.${subType}`, operation: "==", value: subType })
    })
  }
  if (request.soldPrice) {
    queries.push({ field: 'queryDetails.soldPrice', operation: "==", value: request.soldPrice })
  }
  if (request.listingPrice) {
    queries.push({ field: 'queryDetails.listingPrice', operation: "==", value: request.listingPrice })
  }
  if (request.soldVolume) {
    queries.push({ field: 'queryDetails.soldVolume', operation: "==", value: request.soldVolume })
  }
  if (request.listingVolume) {
    queries.push({ field: 'queryDetails.listingVolume', operation: "==", value: request.listingVolume })
  }
  if (request.totalCirculation) {
    queries.push({ field: 'queryDetails.totalCirculation', operation: "==", value: request.totalCirculation })
  }
  if (request.supplyVsDemand) {
    queries.push({ field: 'queryDetails.supplyVsDemand', operation: "==", value: request.supplyVsDemand })
  }
  if (request.volatility) {
    queries.push({ field: 'queryDetails.volatility', operation: "==", value: request.volatility })
  }
  if (request.tags) {
    request.tags.forEach(tag => {
      queries.push({field: `queryTags.${tag}`, operation: "==", value: tag})
    })
  }
  return queries;
}

export const cardQueryDetailBuilder = {
  calculateQueryDetails,
  buildQueries,
  calculateQueryTags,
}