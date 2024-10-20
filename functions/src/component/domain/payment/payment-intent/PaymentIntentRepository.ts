import {repositoryFactory} from "../../../database/RepositoryFactory";
import {PaymentIntentEntity} from "./PaymentIntentEntity";


const COLLECTION_NAME = 'stripe-payment-intent'

const result = repositoryFactory.build<PaymentIntentEntity>(COLLECTION_NAME);

export const paymentIntentRepository = result.repository;
export const basePaymentIntentCreator = result.creator;
export const basePaymentIntentUpdater = result.updater;
export const basePaymentIntentDeleter = result.deleter;