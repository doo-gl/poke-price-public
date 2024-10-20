import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";
import {ItemEntity, legacyIdOrFallback, SingleCardItemDetails} from "./ItemEntity";
import {SINGLE_POKEMON_CARD_ITEM_TYPE} from "../marketplace/item-details/SinglePokemonCardItemDetails";
import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {capitaliseKey} from "../../tools/KeyConverter";
import {CardEntity, CardVariant} from "../card/CardEntity";

const SERIES_COMPARATOR = comparatorBuilder.objectAttributeASC<ItemEntity, string>(value => {
  if (value.itemType !== SINGLE_POKEMON_CARD_ITEM_TYPE) {
    return ''
  }
  return value.itemDetails.series ?? ''
});
const SET_COMPARATOR = comparatorBuilder.objectAttributeASC<ItemEntity, string>(value => {
  if (value.itemType !== SINGLE_POKEMON_CARD_ITEM_TYPE) {
    return ''
  }
  return value.itemDetails.set ?? ''
});
const NUMBER_BEFORE_STRING_COMPARATOR = comparatorBuilder.objectAttributeASC<ItemEntity, number>(value => {
  if (value.itemType !== SINGLE_POKEMON_CARD_ITEM_TYPE) {
    return 0
  }
  const firstLetter = value.itemDetails.cardNumber.slice(0, 1);
  if (!firstLetter || firstLetter.length === 0) {
    return Number.MAX_SAFE_INTEGER;
  }
  if (firstLetter.match(/[0-9]/gim)) {
    return -Number.MAX_SAFE_INTEGER
  }
  return Number.MAX_SAFE_INTEGER
})
const NUMBER_COMPARATOR = comparatorBuilder.objectAttributeASC<ItemEntity, number>(value => {
  if (value.itemType !== SINGLE_POKEMON_CARD_ITEM_TYPE) {
    return 0
  }
  const stringWithNumbers = value.itemDetails.cardNumber.replace(/[^0-9]/gim, '');
  if (stringWithNumbers.length === 0) {
    return Number.MAX_SAFE_INTEGER;
  }
  try {
    return Number(stringWithNumbers)
  } catch (err:any) {
    return Number.MAX_SAFE_INTEGER;
  }
})
const STRING_COMPARATOR = comparatorBuilder.objectAttributeASC<ItemEntity, string>(value => {
  if (value.itemType !== SINGLE_POKEMON_CARD_ITEM_TYPE) {
    return ''
  }
  return value.itemDetails.cardNumber.replace(/[0-9]/gim, '')
})
const VARIANT_COMPARATOR = comparatorBuilder.objectAttributeASC<ItemEntity, string>(value => {
  if (value.itemType !== SINGLE_POKEMON_CARD_ITEM_TYPE) {
    return ''
  }
  return value.itemDetails.variant
})

// Order by
// Series
// Set
// Number in set (putting non numbers at the end of the list)
// Variant
export const BY_NUMBER_CARD_COMPARATOR = comparatorBuilder.combineAll(
  SERIES_COMPARATOR,
  SET_COMPARATOR,
  NUMBER_BEFORE_STRING_COMPARATOR,
  NUMBER_COMPARATOR,
  STRING_COMPARATOR,
  VARIANT_COMPARATOR
)

export const toCard = (item:ItemEntity):SingleCardItemDetails|null => {
  if (item.itemType !== SINGLE_POKEMON_CARD_ITEM_TYPE) {
    return null;
  }
  return item.itemDetails as SingleCardItemDetails
}

export const toCardOrThrow = (item:ItemEntity):SingleCardItemDetails => {
  if (item.itemType !== SINGLE_POKEMON_CARD_ITEM_TYPE) {
    throw new InvalidArgumentError(`Item: ${legacyIdOrFallback(item)} does not have item type: ${SINGLE_POKEMON_CARD_ITEM_TYPE}`)
  }
  return item.itemDetails as SingleCardItemDetails
}

export const extractCardName = (card:ItemEntity) => {
  const cardDetails = toCard(card)
  if (!cardDetails) {
    return null;
  }
  return !cardDetails.variant || cardDetails.variant === CardVariant.DEFAULT
    ? card.displayName
    : `${card.displayName} | ${formatVariant(cardDetails.variant)}`
}

export const formatVariant = (variant:CardVariant):string => {
  return capitaliseKey(variant).replace(/_/g, ' ')
}