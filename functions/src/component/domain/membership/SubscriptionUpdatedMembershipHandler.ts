import {SubscriptionEntity} from "../payment/subscription/SubscriptionEntity";
import {userRetriever} from "../user/UserRetriever";
import {UnexpectedError} from "../../error/UnexpectedError";
import {membershipStatusCalculator} from "./MembershipStatusCalculator";
import {lodash} from "../../external-lib/Lodash";
import {userUpdater} from "../user/UserRepository";
import {logger} from "firebase-functions";
import {STRIPE_METADATA_USER_ID_KEY} from "../payment/checkout-session/CheckoutSessionStarter";
import {mailchimpEventHandler} from "../mailchimp/MailchimpEventHandler";
import {MembershipPlan} from "./MembershipStatus";
import {subscriptionRetriever} from "../payment/subscription/SubscriptionRetriever";
import {userSubscriptionEventHandler} from "../user/event/UserSubscriptionEventHandler";


const handle = async (subscriptionId:string):Promise<void> => {

  const subscription = await subscriptionRetriever.retrieve(subscriptionId)
  // Do not use stripe customer id to find user
  // want to break the link between the user who pays for something and the user who receives it
  // A person might use one email for signing up to poke price and a different one for paypal
  // Use the metadata on the sub to decide which poke price user the sub was intended for.
  const metadata = subscription.metadata ?? {}
  const userId = metadata[STRIPE_METADATA_USER_ID_KEY] ?? null;
  if (!userId) {
    throw new UnexpectedError(`Stripe subscription: ${subscription.id}, ${subscription.stripeSubscriptionId} has no user id metadata`)
  }
  const user = await userRetriever.retrieveOptional(userId);
  if (!user) {
    throw new UnexpectedError(`No user exists id: ${userId}, from subscription: ${subscription.id}, ${subscription.stripeSubscriptionId}`)
  }
  const currentPlans = user.membership?.plans ?? [];
  const plans = await membershipStatusCalculator.calculate(user.id);
  if (plans.length === 0) {
    logger.info(`Found no plans for user with id: ${user.id}`)
    await userUpdater.updateOnly(user.id, { membership: null })
    if (currentPlans.some(plan => plan === MembershipPlan.POKE_PRICE_PRO)) {
      await mailchimpEventHandler.onSubscriptionEnded(user)
    }
    return;
  }
  logger.info(`Found ${plans.length} plans for user with id: ${user.id}`)

  if (lodash.isNotEqual(currentPlans.sort(), plans.sort())) {
    await userUpdater.updateOnly(user.id, { membership: { plans: plans.sort() } })
    if (plans.some(plan => plan === MembershipPlan.POKE_PRICE_PRO)) {
      await mailchimpEventHandler.onSubscription(user)
      await userSubscriptionEventHandler.onSubscription(user)
    }
  }
}

export const subscriptionUpdatedMembershipHandler = {
  handle,
}