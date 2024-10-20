import {byIdRetriever} from "../../../database/ByIdRetriever";
import {singleResultRepoQuerier} from "../../../database/SingleResultRepoQuerier";
import {SubscriptionEntity} from "./SubscriptionEntity";
import {subscriptionRepository} from "./SubscriptionRepository";
import {STRIPE_METADATA_USER_ID_KEY} from "../checkout-session/CheckoutSessionStarter";


const retrieve = (id:string):Promise<SubscriptionEntity> => {
  return byIdRetriever.retrieve(subscriptionRepository, id, subscriptionRepository.collectionName);
}

const retrieveOptionalByStripeSubscriptionId = (stripeSubscriptionId:string):Promise<SubscriptionEntity|null> => {
  return singleResultRepoQuerier.query(
    subscriptionRepository,
    [{ name: "stripeSubscriptionId", value: stripeSubscriptionId }],
    subscriptionRepository.collectionName
  )
}

const retrieveActiveSubscriptionsForCustomerId = (customerId:string):Promise<Array<SubscriptionEntity>> => {
  return subscriptionRepository.getMany([
    { field: "status", operation: "in", value: ['active', 'past_due', 'trialing'] },
    { field: "customerId", operation: "==", value: customerId },
  ]);
}

const retrieveActiveSubscriptionsForUserId = (userId:string):Promise<Array<SubscriptionEntity>> => {
  return subscriptionRepository.getMany([
    { field: "status", operation: "in", value: ['active', 'past_due', 'trialing'] },
    { field: `metadata.${STRIPE_METADATA_USER_ID_KEY}`, operation: "==", value: userId },
  ]);
}

export const subscriptionRetriever = {
  retrieve,
  retrieveOptionalByStripeSubscriptionId,
  retrieveActiveSubscriptionsForCustomerId,
  retrieveActiveSubscriptionsForUserId,
}