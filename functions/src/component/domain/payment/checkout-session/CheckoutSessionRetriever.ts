import {byIdRetriever} from "../../../database/ByIdRetriever";
import {singleResultRepoQuerier} from "../../../database/SingleResultRepoQuerier";
import {CheckoutSessionEntity} from "./CheckoutSessionEntity";
import {checkoutSessionRepository} from "./CheckoutSessionRepository";


const retrieve = (id:string):Promise<CheckoutSessionEntity> => {
  return byIdRetriever.retrieve(checkoutSessionRepository, id, checkoutSessionRepository.collectionName);
}

const retrieveOptionalByStripeCheckoutSessionId = (stripeCheckoutSessionId:string):Promise<CheckoutSessionEntity|null> => {
  return singleResultRepoQuerier.query(
    checkoutSessionRepository,
    [{ name: "stripeCheckoutSessionId", value: stripeCheckoutSessionId }],
    checkoutSessionRepository.collectionName
  )
}

const retrieveByStripeCustomerId = (stripeCustomerId:string):Promise<Array<CheckoutSessionEntity>> => {
  return checkoutSessionRepository.getMany([
    {field: "customerId", operation: "==", value: stripeCustomerId},
  ])
}

export const checkoutSessionRetriever = {
  retrieve,
  retrieveOptionalByStripeCheckoutSessionId,
  retrieveByStripeCustomerId,
}