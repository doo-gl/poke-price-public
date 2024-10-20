import {repositoryFactory} from "../../../database/RepositoryFactory";
import {CheckoutSessionEntity} from "./CheckoutSessionEntity";


const COLLECTION_NAME = 'stripe-checkout-session'

const result = repositoryFactory.build<CheckoutSessionEntity>(COLLECTION_NAME);

export const checkoutSessionRepository = result.repository;
export const baseCheckoutSessionCreator = result.creator;
export const baseCheckoutSessionUpdater = result.updater;
export const baseCheckoutSessionDeleter = result.deleter;