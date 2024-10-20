import {CurrencyAmountLike} from "../../money/CurrencyAmount";
import {CardCondition} from "../../historical-card-price/CardCondition";


const convert = (nearMintPokePrice:CurrencyAmountLike, condition:CardCondition):CurrencyAmountLike => {
  switch (condition) {
    case CardCondition.NEAR_MINT:
      return nearMintPokePrice
    case CardCondition.LIGHTLY_PLAYED:
      return {
        amountInMinorUnits: Math.round(nearMintPokePrice.amountInMinorUnits * 0.7),
        currencyCode: nearMintPokePrice.currencyCode,
      }
    case CardCondition.MODERATELY_PLAYED:
      return {
        amountInMinorUnits: Math.round(nearMintPokePrice.amountInMinorUnits * 0.6),
        currencyCode: nearMintPokePrice.currencyCode,
      }
    case CardCondition.HEAVILY_PLAYED:
      return {
        amountInMinorUnits: Math.round(nearMintPokePrice.amountInMinorUnits * 0.5),
        currencyCode: nearMintPokePrice.currencyCode,
      }
    case CardCondition.DAMAGED:
      return {
        amountInMinorUnits: Math.round(nearMintPokePrice.amountInMinorUnits * 0.3),
        currencyCode: nearMintPokePrice.currencyCode,
      }
  }
  return nearMintPokePrice;
}

export const conditionalPokePriceConverter = {
  convert,
}