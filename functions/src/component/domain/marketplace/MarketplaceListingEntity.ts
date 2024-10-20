import {MongoEntity} from "../../database/mongo/MongoEntity";
import {CurrencyAmountLike} from "../money/CurrencyAmount";
import {mongoRepositoryFactory} from "../../database/mongo/MongoRepositoryFactory";
import {SearchTag} from "../search-tag/SearchTagEntity";

export interface MarketplaceListingSort {
  price:number,
  profit:number,
  endTime:Date,
}

export interface PopularTags {
  profitableAndGbp:boolean
}

export interface MarketplaceListingEntity extends MongoEntity {

  mostRecentUpdate:Date,

  listingEndsAt:Date|null,

  currentItemPrice:CurrencyAmountLike|null,
  currentBidPrice:CurrencyAmountLike|null,
  currentBidProfit:CurrencyAmountLike|null,
  currentBuyNowPrice:CurrencyAmountLike|null,
  currentBuyNowProfit:CurrencyAmountLike|null,
  currentProfit:CurrencyAmountLike|null,
  currentPrice:CurrencyAmountLike|null,

  listingId:string,
  listingType:string,
  listingDetails:ListingDetails,

  itemId:string,
  itemType:string
  itemDetails:ItemDetails,

  tags:Array<string>,
  searchTags:Array<SearchTag>
  popularTags?:PopularTags,

  sort:MarketplaceListingSort,
}

export interface ListingDetails {}
export interface ListingDetailMapper<TYPE extends string, DETAILS extends ListingDetails> {
  type: () => TYPE,
  details: (value:MarketplaceListingEntity) => DETAILS,
  optionalDetails: (value:MarketplaceListingEntity) => DETAILS|null,
}

export interface ItemDetails {}
export interface ItemDetailMapper<TYPE extends string, DETAILS extends ItemDetails> {
  type: () => TYPE,
  details: (value:MarketplaceListingEntity) => DETAILS,
  optionalDetails: (value:MarketplaceListingEntity) => DETAILS|null,
}


const COLLECTION_NAME = 'marketplace.listings'

const result = mongoRepositoryFactory.build<MarketplaceListingEntity>(COLLECTION_NAME);
export const marketplaceListingRepository = result.repository;
export const marketplaceListingCreator = result.creator;
export const marketplaceListingUpdater = result.updater;
export const marketplaceListingDeleter = result.deleter;
