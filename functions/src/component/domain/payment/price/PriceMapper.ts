import {PriceEntity} from "./PriceEntity";
import {PriceDto} from "../product/ProductDto";
import {logger} from "firebase-functions";
import {isCurrencyCode} from "../../money/CurrencyCodes";


const mapDto = (price:PriceEntity):PriceDto|null => {
  if (!price.unitAmount) {
    logger.error(`Price with id: ${price.id} has no unit amount set`);
    return null;
  }
  const currencyCode = price.currency.toUpperCase()
  if (!isCurrencyCode(currencyCode)) {
    logger.error(`Price with id: ${price.id}, does not use a valid currency code: ${currencyCode}`);
    return null;
  }

  return {
    priceId: price.id,
    amount: {
      amountInMinorUnits: price.unitAmount,
      // @ts-ignore
      currencyCode,
    },
    interval: price.interval,
    intervalCount: price.intervalCount,
  }
}

export const priceMapper = {
  mapDto,
}