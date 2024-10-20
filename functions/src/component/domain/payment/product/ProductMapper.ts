import {ProductEntity} from "./ProductEntity";
import {ProductDto} from "./ProductDto";
import {PriceEntity} from "../price/PriceEntity";
import {removeNulls} from "../../../tools/ArrayNullRemover";
import {priceMapper} from "../price/PriceMapper";
import {logger} from "firebase-functions";


const mapDto = (product:ProductEntity, prices:Array<PriceEntity>):ProductDto|null => {
  const priceDtos = removeNulls(prices.map(price => priceMapper.mapDto(price)));
  if (priceDtos.length === 0) {
    logger.info(`Product with id: ${product.id}, does not have any valid prices`);
    return null;
  }
  return {
    name: product.name,
    productId: product.id,
    prices: priceDtos,
  }
}

export const productMapper = {
  mapDto,
}