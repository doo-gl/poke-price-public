import {Stripe} from "stripe";
import {productRetriever} from "../product/ProductRetriever";
import {baseProductDeleter} from "../product/ProductRepository";


const deleteProduct = async (product:Stripe.Product):Promise<void> => {
  const productEntity = await productRetriever.retrieveOptionalByStripeProductId(product.id);
  if (!productEntity) {
    return;
  }
  await baseProductDeleter.delete(productEntity.id);
}

export const webhookProductDeleter = {
  deleteProduct,
}