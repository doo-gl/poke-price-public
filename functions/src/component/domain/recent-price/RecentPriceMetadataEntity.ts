import {Entity} from "../../database/Entity";
import {RecentPriceDto} from "./RecentPriceRetriever";
import {repositoryFactory} from "../../database/RepositoryFactory";
import {Timestamp} from "../../external-lib/Firebase";

const COLLECTION_NAME = 'recent-price-metadata';

export interface RecentPriceMetadataEntity extends Entity {
  prices:Array<RecentPriceDto>,
  revealFromListingId:string|null,
  revealToListingId:string|null,
  revealingFrom:Timestamp|null,
  revealingTo:Timestamp|null,
}

const result = repositoryFactory.build<RecentPriceMetadataEntity>(COLLECTION_NAME);
export const recentPriceMetadataRepository = result.repository;
export const recentPriceMetadataCreator = result.creator;
export const recentPriceMetadataUpdater = result.updater;
export const recentPriceMetadataDeleter = result.deleter;