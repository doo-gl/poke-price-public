import {MembershipPlan} from "./MembershipStatus";
import {userRetriever} from "../user/UserRetriever";
import {subscriptionRetriever} from "../payment/subscription/SubscriptionRetriever";
import {flattenArray} from "../../tools/ArrayFlattener";
import {removeNulls} from "../../tools/ArrayNullRemover";
import {extractId} from "../payment/StripeIdExtractor";
import {productRetriever} from "../payment/product/ProductRetriever";
import {ProductEntity} from "../payment/product/ProductEntity";
import {SubscriptionEntity} from "../payment/subscription/SubscriptionEntity";
import {lodash} from "../../external-lib/Lodash";
import {logger} from "firebase-functions";

const mapProductToPlan = (product:ProductEntity):MembershipPlan|null => {
  if (!product.metadata.plan) {
    return null;
  }
  switch (product.metadata.plan) {
    case MembershipPlan.POKE_PRICE_LITE:
      return MembershipPlan.POKE_PRICE_LITE;
    case MembershipPlan.POKE_PRICE_PRO:
      return MembershipPlan.POKE_PRICE_PRO;
    default:
      return null;
  }
}

const calculateFromSubscriptions = async (subscriptions:Array<SubscriptionEntity>):Promise<Array<MembershipPlan>> => {
  if (subscriptions.length === 0) {
    return []
  }
  const subscribedItems = flattenArray(subscriptions.map(sub => sub.items));
  const stripeProductIds = removeNulls(subscribedItems.map(item => extractId(item.price.product)));
  const products = await productRetriever.retrieveByStripeProductIds(stripeProductIds);
  const plans = removeNulls(products.map(product => mapProductToPlan(product)))
  return lodash.uniq(plans);
}

const calculate = async (userId:string):Promise<Array<MembershipPlan>> => {
  const subscriptions = await subscriptionRetriever.retrieveActiveSubscriptionsForUserId(userId);
  logger.info(`Found active subscriptions for user id: ${userId}, ids: [${subscriptions.map(sub => sub.id).join(',')}]`)
  const plans = calculateFromSubscriptions(subscriptions)
  return plans;
}

export const membershipStatusCalculator = {
  calculate,
  calculateFromSubscriptions,
  mapProductToPlan,
}