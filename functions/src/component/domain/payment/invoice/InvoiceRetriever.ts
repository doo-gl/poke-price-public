import {byIdRetriever} from "../../../database/ByIdRetriever";
import {singleResultRepoQuerier} from "../../../database/SingleResultRepoQuerier";
import {InvoiceEntity} from "./InvoiceEntity";
import {invoiceSessionRepository} from "./InvoiceRepository";
import {CheckoutSessionEntity} from "../checkout-session/CheckoutSessionEntity";
import {checkoutSessionRepository} from "../checkout-session/CheckoutSessionRepository";


const retrieve = (id:string):Promise<InvoiceEntity> => {
  return byIdRetriever.retrieve(invoiceSessionRepository, id, invoiceSessionRepository.collectionName);
}

const retrieveOptionalByStripeInvoiceId = (stripeInvoiceId:string):Promise<InvoiceEntity|null> => {
  return singleResultRepoQuerier.query(
    invoiceSessionRepository,
    [{ name: "stripeInvoiceId", value: stripeInvoiceId }],
    invoiceSessionRepository.collectionName
  )
}

const retrieveByStripeCustomerId = (stripeCustomerId:string):Promise<Array<InvoiceEntity>> => {
  return invoiceSessionRepository.getMany([
    {field: "customerId", operation: "==", value: stripeCustomerId},
  ])
}

export const invoiceRetriever = {
  retrieve,
  retrieveOptionalByStripeInvoiceId,
  retrieveByStripeCustomerId,
}