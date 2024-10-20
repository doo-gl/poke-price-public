import StripeConstructor, {Stripe} from 'stripe';
import {configRetriever} from "../infrastructure/ConfigRetriever";
import {UnexpectedError} from "../error/UnexpectedError";

const config = configRetriever.retrieve();

let stripe:Stripe|null = null

/*
 For docs see: https://github.com/stripe/stripe-node and https://stripe.com/docs/api?lang=node
 */

export const getStripe = () => {
  if (stripe) {
    return stripe
  }
  const key = config.stripeSecretKey()
  if (!key) {
    throw new UnexpectedError("No stripe secret key")
  }
  stripe = new StripeConstructor(key, { apiVersion: '2020-08-27' })
  return stripe
}
