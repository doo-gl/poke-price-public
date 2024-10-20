import {CardEntity} from "./CardEntity";
import {capitaliseKey} from "../../tools/KeyConverter";
import {CurrencyAmount, fromCurrencyAmountLike} from "../money/CurrencyAmount";
import {CardContent, Content, DescriptionClauses} from "./PublicCardDto";

const EMPTY:DescriptionClauses = { clauses:[] };
const merge = (left:DescriptionClauses, right:DescriptionClauses):DescriptionClauses => {
  return {
    clauses: new Array<string>().concat(left.clauses).concat(right.clauses),
  }
}

const name = (card:CardEntity):DescriptionClauses => {
  const fullName = card.fullName || capitaliseKey(card.name);
  const setName = capitaliseKey(card.set);
  const code = `${card.numberInSet.toUpperCase()}/${card.displaySetNumber.toUpperCase()}`;
  return {
    clauses: [`The <b>${fullName} (${code})</b> card can be found in the <b>${setName}</b> set.`],
  };
}

const rarityArtist = (card:CardEntity):DescriptionClauses => {
  const artist = card.artist;
  const rarity = card.rarity;
  if (rarity && artist) {
    return {
      clauses: [`This <b>${capitaliseKey(rarity)}</b> card was illustrated by <b>${artist}</b>.`],
    }
  }
  if (rarity) {
    return {
      clauses: [`This is a <b>${capitaliseKey(rarity)}</b> card.`],
    }
  }
  if (artist) {
    return {
      clauses: [`This card was illustrated by <b>${artist}</b>.`],
    };
  }
  return EMPTY;
}

const subType = (card:CardEntity):DescriptionClauses => {
  if (!card.subTypes || card.subTypes.length === 0) {
    return EMPTY;
  }
  const subTypes = card.subTypes;
  if (subTypes.some(st => st === 'v')) {
    return {
      clauses: [`The fact that it is a <b>V</b> card makes it one of the more valuable cards.`],
    };
  }
  if (subTypes.some(st => st === 'vmax')) {
    return {
      clauses: [`The fact that it is a <b>VMAX</b> card makes it one of the more valuable cards.`],
    };
  }
  if (subTypes.some(st => st === 'ex')) {
    return {
      clauses: [`The fact that it is a <b>EX</b> card makes it one of the more valuable cards.`],
    };
  }
  if (subTypes.some(st => st === 'gx')) {
    return {
      clauses: [`The fact that it is a <b>GX</b> card makes it one of the more valuable cards.`],
    };
  }
  return EMPTY;
}

const sold = (card:CardEntity):DescriptionClauses => {
  if (!card.pokePrice || !card.pokePrice.price || card.pokePrice.price.amountInMinorUnits === 0) {
    return EMPTY;
  }
  const soldPrice = card.pokePrice.price;
  const soldVolume = card.pokePrice.volume;
  const priceString = fromCurrencyAmountLike(soldPrice).toString();
  if (soldVolume) {

    return {
      clauses: [`Recently sold <b>${soldVolume}</b> times and based on those sales is worth around <b>${priceString}</b>.`],
    };
  }
  return {
    clauses: [`Based on recent sales, this card is worth around <b>${priceString}</b>.`],
  }
}

const open = (card:CardEntity):DescriptionClauses => {
  if (!card.pokePrice || card.pokePrice.openListingVolume === null || card.pokePrice.openListingVolume === undefined) {
    return EMPTY;
  }
  const openVolume = card.pokePrice.openListingVolume;
  if (openVolume > 1) {
    return {
      clauses: [`Currently, there are <b>${openVolume}</b> open listings for this card on ebay.`],
    }
  }
  if (openVolume === 1) {
    return {
      clauses: [`Currently, there is <b>${openVolume}</b> open listing for this card on ebay.`],
    }
  }
  if (openVolume === 0) {
    return {
      clauses: [`Currently, there are <b>no open listings</b> for this card on ebay.`],
    }
  }
  return EMPTY;
}

const volatility = (card:CardEntity):DescriptionClauses => {
  if (
    !card.pokePrice || !card.pokePrice.shortViewMean || !card.pokePrice.shortViewStandardDeviation
    || card.pokePrice.shortViewMean.amountInMinorUnits === 0
  ) {
    return EMPTY;
  }
  const mean = fromCurrencyAmountLike(card.pokePrice.shortViewMean);
  const standardDeviation = fromCurrencyAmountLike(card.pokePrice.shortViewStandardDeviation);
  let lowerBound = mean.subtract(standardDeviation);
  if (!lowerBound.isPositive()) {
    lowerBound = new CurrencyAmount(1, lowerBound.currencyCode);
  }
  const upperBound = mean.add(standardDeviation);
  const boundText = `This card sells in the range of <b>${lowerBound.toString()}</b> to <b>${upperBound.toString()}</b>`
  const isHighlyVolatile = standardDeviation.greaterThanOrEqual(new CurrencyAmount(4000, mean.currencyCode))
  const isQuiteVolatile = standardDeviation.greaterThanOrEqual(new CurrencyAmount(2000, mean.currencyCode))
  const isQuiteStable = standardDeviation.greaterThanOrEqual(new CurrencyAmount(1000, mean.currencyCode))
  const isStable = standardDeviation.greaterThanOrEqual(new CurrencyAmount(500, mean.currencyCode))
  if (isHighlyVolatile) {
    return {
      clauses: [`${boundText}, making it <b>highly volatile</b>.`],
    }
  }
  if (isQuiteVolatile) {
    return {
      clauses: [`${boundText}, making it <b>quite volatile</b>.`],
    }
  }
  if (isQuiteStable) {
    return {
      clauses: [`${boundText}, making it <b>quite stable</b>.`],
    }
  }
  if (isStable) {
    return {
      clauses: [`${boundText}, making it <b>stable</b>.`],
    }
  }
  return {
    clauses: [`${boundText}, making it <b>very stable</b>.`],
  }
}

const map = (card:CardEntity):CardContent => {
  return {
    description: [
      merge(name(card), sold(card)),
      merge(open(card), volatility(card)),
      merge(rarityArtist(card), subType(card)),
    ],
  }
}

export const cardContentMapper = {
  map,
}