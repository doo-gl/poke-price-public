import {priceRetriever} from "../price/PriceRetriever";
import {NotFoundError} from "../../../error/NotFoundError";
import {getStripe} from "../../../external-lib/Stripe";
import {UnexpectedError} from "../../../error/UnexpectedError";
import {userContext} from "../../../infrastructure/UserContext";
import {InvalidArgumentError} from "../../../error/InvalidArgumentError";
import {logger} from "firebase-functions";
import {UserEntity} from "../../user/UserEntity";
import {customerGetserter} from "../customer/CustomerGetserter";
import {PriceEntity} from "../price/PriceEntity";
import {productRetriever} from "../product/ProductRetriever";
import {membershipStatusCalculator} from "../../membership/MembershipStatusCalculator";

export interface CheckoutSessionStartRequest {
  priceId:string,
  successUrl:string,
  cancelUrl:string,
}

export interface CheckoutSessionStartResponse {
  sessionUrl:string
}

export const STRIPE_METADATA_USER_ID_KEY = 'poke_price_user_id'

const getCustomerId = (user:UserEntity):Promise<string|undefined> => {
  return customerGetserter.getOrInsertCustomerIdFromUser(user)
    .catch(err => {
      logger.error(`Failed to get stripe customer for user: ${user.id}, ${err.message}`, err)
      return undefined;
    })
}

const isUserAlreadySubscribed = async (user:UserEntity, price:PriceEntity):Promise<boolean> => {
  const product = await productRetriever.retrieveOptionalByStripeProductId(price.productId)
  if (!product) {
    throw new NotFoundError(`Price: ${price.id} does not map to a product`)
  }
  const plan = membershipStatusCalculator.mapProductToPlan(product);
  if (!plan) {
    throw new NotFoundError(`Product: ${product.id} does not map to a plan`)
  }
  return user.membership?.plans.some(pl => pl === plan) ?? false
}

const start = async (request:CheckoutSessionStartRequest):Promise<CheckoutSessionStartResponse> => {
  const price = await priceRetriever.retrieveActive(request.priceId);
  if (!price) {
    throw new NotFoundError(`No price found with ID: ${request.priceId}`);
  }
  const user = userContext.getUser();
  if (!user) {
    throw new InvalidArgumentError(`No user provided to start session`)
  }
  const isAlreadySubscribed = await isUserAlreadySubscribed(user, price);
  if (isAlreadySubscribed) {
    throw new InvalidArgumentError(`Already subscribed`)
  }

  const pokePriceUserId = user.id;
  const metadata:{[key:string]:string} = {}
  metadata[STRIPE_METADATA_USER_ID_KEY] = pokePriceUserId;

  const customerId = await getCustomerId(user);

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    success_url: request.successUrl,
    cancel_url: request.cancelUrl,
    customer: customerId,
    line_items: [{ price: price.stripePriceId, quantity: 1 }],
    allow_promotion_codes: true,
    subscription_data: {
      metadata,
    },
    metadata,
  });

  if (!session.url) {
    throw new UnexpectedError(`Failed to create checkout session`)
  }

  return { sessionUrl: session.url }
}

export const checkoutSessionStarter = {
  start,
}