import {ProductDto} from "./ProductDto";
import {productRetriever} from "./ProductRetriever";
import {priceRetriever} from "../price/PriceRetriever";
import {productMapper} from "./ProductMapper";
import {removeNulls} from "../../../tools/ArrayNullRemover";
import {MembershipPlan} from "../../membership/MembershipStatus";


const retrieve = async ():Promise<Array<ProductDto>> => {
  const products = (await productRetriever.retrieveActive())
    .filter(product => product.metadata.plan === MembershipPlan.POKE_PRICE_PRO);
  const productIds = products.map(product => product.stripeProductId);
  const productIdToPrices = await priceRetriever.retrieveActiveByStripeProductIds(productIds);
  const productDtos = removeNulls(
    products.map(product => {
      const prices = productIdToPrices.get(product.stripeProductId);
      if (!prices || prices.length === 0) {
        return null;
      }
      return productMapper.mapDto(product, prices);
    })
  )
  return productDtos;
}

export const productDtoRetriever = {
  retrieve,
}