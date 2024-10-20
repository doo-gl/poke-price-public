import {repositoryFactory} from "../../../database/RepositoryFactory";
import {SubscriptionEntity} from "./SubscriptionEntity";


const COLLECTION_NAME = 'stripe-subscription'

const result = repositoryFactory.build<SubscriptionEntity>(COLLECTION_NAME);

export const subscriptionRepository = result.repository;
export const baseSubscriptionCreator = result.creator;
export const baseSubscriptionUpdater = result.updater;
export const baseSubscriptionDeleter = result.deleter;