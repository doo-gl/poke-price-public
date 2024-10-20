import {repositoryFactory} from "../../../database/RepositoryFactory";
import {TaxRateEntity} from "./TaxRateEntity";


const COLLECTION_NAME = 'stripe-tax-rate'

const result = repositoryFactory.build<TaxRateEntity>(COLLECTION_NAME);

export const taxRateRepository = result.repository;
export const baseTaxRateCreator = result.creator;
export const baseTaxRateUpdater = result.updater;
export const baseTaxRateDeleter = result.deleter;