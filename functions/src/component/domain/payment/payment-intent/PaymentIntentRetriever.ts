import {byIdRetriever} from "../../../database/ByIdRetriever";
import {singleResultRepoQuerier} from "../../../database/SingleResultRepoQuerier";
import {PaymentIntentEntity} from "./PaymentIntentEntity";
import {paymentIntentRepository} from "./PaymentIntentRepository";
import {CheckoutSessionEntity} from "../checkout-session/CheckoutSessionEntity";
import {checkoutSessionRepository} from "../checkout-session/CheckoutSessionRepository";


const retrieve = (id:string):Promise<PaymentIntentEntity> => {
  return byIdRetriever.retrieve(paymentIntentRepository, id, paymentIntentRepository.collectionName);
}

const retrieveOptionalByStripePaymentIntentId = (stripePaymentIntentId:string):Promise<PaymentIntentEntity|null> => {
  return singleResultRepoQuerier.query(
    paymentIntentRepository,
    [{ name: "stripePaymentIntentId", value: stripePaymentIntentId }],
    paymentIntentRepository.collectionName
  )
}

const retrieveByStripeCustomerId = (stripeCustomerId:string):Promise<Array<PaymentIntentEntity>> => {
  return paymentIntentRepository.getMany([
    {field: "customerId", operation: "==", value: stripeCustomerId},
  ])
}

export const paymentIntentRetriever = {
  retrieve,
  retrieveOptionalByStripePaymentIntentId,
  retrieveByStripeCustomerId,
}