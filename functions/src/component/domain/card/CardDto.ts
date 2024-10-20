import {CardVariant, ExternalIdentifiers, Image, PokePrice, PokePriceV2, SearchKeywords, Tag} from "./CardEntity";
import {EntityDto} from "../EntityDto";
import {UniqueCard} from "./UniqueCard";
import {SetId} from "../set/UniqueSet";
import {CurrencyAmountLike} from "../money/CurrencyAmount";

export interface PokePriceDtoV2 {
  soldPrice:CurrencyAmountLike|null,
  soldVolume:number|null,
  soldMinPrice:CurrencyAmountLike|null,
  soldLowPrice:CurrencyAmountLike|null,
  soldHighPrice:CurrencyAmountLike|null,
  soldMaxPrice:CurrencyAmountLike|null,
  soldLastUpdatedAt:string|null
  soldMostRecentPrice:string|null,
  soldStatIds:Array<string>|null,

  listingPrice:CurrencyAmountLike|null,
  listingVolume:number|null,
  listingMinPrice:CurrencyAmountLike|null,
  listingLowPrice:CurrencyAmountLike|null,
  listingHighPrice:CurrencyAmountLike|null,
  listingMaxPrice:CurrencyAmountLike|null,
  listingLastUpdatedAt:string|null,
  listingMostRecentPrice:string|null,
  listingStatIds:Array<string>|null,
}

export interface CardDto extends EntityDto, UniqueCard, SetId {
  name:string,
  countInSet:number,
  displaySetNumber:string,
  externalIdentifiers:ExternalIdentifiers,
  tags:Array<string>,
  subTypes:Array<string>,
  superType:string,
  types:Array<string>,
  pokemon:Array<string>,
  rarity:string|null,
  image:Image,
  pokePrice:PokePrice|null,
  visible:boolean,
  fullName:string|null,
  displayName:string,
  artist:string|null,
  flavourText:string|null,
  mostRecentEbayOpenListingSourcing:string,
  mostRecentStatCalculation:string,
  searchKeywords:SearchKeywords,
  nextPokePriceCalculationTime:string,
  pokePriceV2:PokePriceDtoV2|null,
  soldUrl:string|null,
  listingUrl:string|null,
  priority:number,
}

export interface CardCsvDto {
  id:string,
  dateCreated:string,
  dateLastModified:string,
  series:string,
  set:string,
  setId:string,
  name:string,
  fullName:string,
  numberInSet:string,
  displaySetNumber:string,
  subTypes:string,
  superType:string,
  rarity:string|null,
  image:string,
  openListingUrl:string|null,
  visible:boolean,
  variant:CardVariant,
  isUrlReviewed:boolean,
  includes:string,
  excludes:string,
  ignores:string,
  displayName:string|null,
}
