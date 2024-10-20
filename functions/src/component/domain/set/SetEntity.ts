import {Entity} from "../../database/Entity";
import {ExternalIdentifiers, SearchKeywords} from "../card/CardEntity";
import {CurrencyAmountLike} from "../money/CurrencyAmount";
import {Timestamp} from "../../external-lib/Firebase";
import {UnexpectedError} from "../../error/UnexpectedError";
import {TcgCollectorRegion} from "../tcg-collector/TcgCollectorWebScrapingClient";

export type CreateSetEntity = Omit<SetEntity, keyof Entity>;
type PartialSet = Partial<Omit<SetEntity, keyof Entity>>;
export type UpdateSetEntity = {
  // remove the readonly modifier from each of the properties, so that the update can be built incrementally
  -readonly [P in keyof PartialSet]: PartialSet[P]
};

export interface PokemonTcgApiSetExternalIdentifiers {
  code:string,
  url:string,
  setLastUpdated:string,
}
export interface TcgCollectorSetExternalIdentifiers {
  name:string,
  region:TcgCollectorRegion,
  url:string,
}

export interface PokePrice {
  price:CurrencyAmountLike
}

export enum SetRegion {
  INTERNATIONAL = 'INTERNATIONAL',
  JAPANESE = 'JAPANESE'
}

export interface SetEntity extends Entity {
  series:string,
  name:string,
  imageUrl:string,
  backgroundImageUrl:string|null
  symbolUrl:string|null,
  releaseDate:Timestamp,
  totalCards:number,
  // the number of total cards displayed on a card, like 10/109, is the 10th card of 109, 109 is the display set number
  // this is different from totalCards because some cards have values like 188/185 because they are 'secret'
  // also, total cards needs to take into account different variants within a single card.
  // also, some sets are written as SV16/SV94, so it needs to be a string.
  displaySetNumber:string,
  externalIdentifiers:ExternalIdentifiers,
  setCode?:string|null,
  region:SetRegion,
  pokePrice:PokePrice|null,
  searchKeywords: SearchKeywords,
  visible:boolean,
}

export const getOptionalPokemonTcgApiSetIdentifiers = (set:SetEntity):PokemonTcgApiSetExternalIdentifiers|null => {
  const identifiers:any = set.externalIdentifiers?.POKEMON_TCG_API ?? null
  if (!identifiers || !identifiers.code) {
    return null
  }
  return identifiers
}
export const getPokemonTcgApiSetIdentifiers = (set:SetEntity):PokemonTcgApiSetExternalIdentifiers => {
  const identifiers = getOptionalPokemonTcgApiSetIdentifiers(set)
  if (!identifiers) {
    throw new UnexpectedError(`Set: ${set.id}, is missing a TCG API identifiers`)
  }
  if (!identifiers.code) {
    throw new UnexpectedError(`Set: ${set.id}, is missing a TCG API code`)
  }
  return identifiers
}