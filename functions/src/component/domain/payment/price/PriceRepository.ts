import {repositoryFactory} from "../../../database/RepositoryFactory";
import {PriceEntity} from "./PriceEntity";


const COLLECTION_NAME = 'stripe-price'

const result = repositoryFactory.build<PriceEntity>(COLLECTION_NAME);

export const priceRepository = result.repository;
export const basePriceCreator = result.creator;
export const basePriceUpdater = result.updater;
export const basePriceDeleter = result.deleter;