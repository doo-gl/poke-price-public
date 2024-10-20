import {repositoryFactory} from "../../../database/RepositoryFactory";
import {ProductEntity} from "./ProductEntity";

const COLLECTION_NAME = 'stripe-product'

const result = repositoryFactory.build<ProductEntity>(COLLECTION_NAME);

export const productRepository = result.repository;
export const baseProductCreator = result.creator;
export const baseProductUpdater = result.updater;
export const baseProductDeleter = result.deleter;