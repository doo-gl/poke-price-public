import {Stripe} from "stripe";
import {priceRetriever} from "../price/PriceRetriever";
import {basePriceDeleter} from "../price/PriceRepository";


const deletePrice = async (price:Stripe.Price):Promise<void> => {
  const priceEntity = await priceRetriever.retrieveOptionalByStripePriceId(price.id);
  if (!priceEntity) {
    return;
  }
  await basePriceDeleter.delete(priceEntity.id);
}

export const webhookPriceDeleter = {
  deletePrice,
}