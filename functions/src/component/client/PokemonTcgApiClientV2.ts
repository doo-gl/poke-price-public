import {baseExternalClient} from "./BaseExternalClient";
import {queryString} from "../external-lib/QueryString";
import {configRetriever} from "../infrastructure/ConfigRetriever";
import {dedupe} from "../tools/ArrayDeduper";
import {UnexpectedError} from "../error/UnexpectedError";

export interface PokemonTcgSet {
  id:string,
  name:string,
  series:string,
  printedTotal:number,
  total:number,
  ptcgoCode:string,
  releaseDate:string,
  updatedAt:string,
  images: {
    symbol:string,
    logo:string,
  }
}

export interface PokemonTcgCard {
  id:string,
  name:string,
  supertype:string,
  subtypes?:Array<string>,
  types:Array<string>,
  number:string,
  rarity:string|null,
  artist:string|null,
  flavorText:string|null,
  images: {
    small:string,
    large:string,
  }
  tcgplayer?:PokemonTcgPlayerPriceInfo,
  cardmarket?:PokemonTcgCardMarketPriceInfo,
}

export interface PokemonTcgPlayerPriceInfo {
  url:string,
  updatedAt:string // YYYY/MM/DD eg. 2022/11/07
  prices: {
    normal?:PokemonTcgPlayerPriceDetails,
    holofoil?:PokemonTcgPlayerPriceDetails,
    unlimitedHolofoil?:PokemonTcgPlayerPriceDetails,
    reverseHolofoil?:PokemonTcgPlayerPriceDetails,
    '1stEditionHolofoil'?:PokemonTcgPlayerPriceDetails,
    '1stEditionNormal'?:PokemonTcgPlayerPriceDetails,
    '1stEdition'?:PokemonTcgPlayerPriceDetails,
  }
}

export interface PokemonTcgPlayerPriceDetails {
  low?:number,
  mid?:number,
  high?:number,
  market?:number,
  directLow?:number,
}

export interface PokemonTcgCardMarketPriceInfo {
  url:string,
  updatedAt:string, // YYYY/MM/DD eg. 2022/11/07
  prices:{
    averageSellPrice?:number,
    lowPrice?:number,
    trendPrice?:number,
    germanProLow?:number,
    suggestedPrice?:number,
    reverseHoloSell?:number,
    reverseHoloLow?:number,
    reverseHoloTrend?:number,
    lowPriceExPlus?:number,
    avg1?:number,
    avg7?:number,
    avg30?:number,
    reverseHoloAvg1?:number,
    reverseHoloAvg7?:number,
    reverseHoloAvg30?:number,
  }
}

export interface PokemonTcgDataArray<T> {
  data:Array<T>,
  page:number,
  pageSize:number,
  count:number,
  totalCount:number,
}

export interface PokemonTcgData<T> {
  data:T,
}

const API_ROOT = 'https://api.pokemontcg.io/v2';

const getApiKey = ():string => {
  const key = configRetriever.retrieve().pokemonTcgApiKey()
  if (!key || key.length === 0) {
    throw new UnexpectedError("No pokemon tcg api key")
  }
  return key;
}

const getAllSets = async ():Promise<Array<PokemonTcgSet>> => {
  const response = await baseExternalClient.get<PokemonTcgDataArray<PokemonTcgSet>>(
    `${API_ROOT}/sets`,
    { 'X-Api-Key': getApiKey() },
    null
  );
  return response.data;
};

const getCardsInSet = async (set:PokemonTcgSet):Promise<Array<PokemonTcgCard>> => {
  return getCardsForSetId(set.id)
};

const getCardsForSetId = async (tcgSetId:string):Promise<Array<PokemonTcgCard>> => {
  let page = 1;
  const pageSize = 250;
  const results:Array<PokemonTcgCard> = [];

  const getCards = async () => {
    const query = queryString.stringify({ q: `set.id:${tcgSetId}`, page, pageSize });
    const response = await baseExternalClient.get<PokemonTcgDataArray<PokemonTcgCard>>(
      `${API_ROOT}/cards?${query}`,
      { 'X-Api-Key': getApiKey() },
      null
    );
    response.data.forEach(card => results.push(card));
    if (results.length < response.totalCount) {
      page++;
      await getCards();
    }
  }
  await getCards()

  return dedupe(results, card => card.id);
};

const getSet = async (pokemonTcgSetId:string):Promise<PokemonTcgSet|null> => {
  const response = await baseExternalClient.get<PokemonTcgData<PokemonTcgSet>>(
    `${API_ROOT}/sets/${pokemonTcgSetId}`,
    { 'X-Api-Key': getApiKey() },
    null
  );
  return response.data
}

const getCard = async (pokemonTcgCardId:string):Promise<PokemonTcgCard|null> => {
  const response = await baseExternalClient.get<PokemonTcgData<PokemonTcgCard>>(
    `${API_ROOT}/cards/${pokemonTcgCardId}`,
    { 'X-Api-Key': getApiKey() },
    null
  );
  return response.data
}



export const pokemonTcgApiClientV2 = {
  getCardsInSet,
  getCardsForSetId,
  getSet,
  getAllSets,
  getCard,
}