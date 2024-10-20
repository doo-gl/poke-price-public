import {ConcurrentPromiseQueue} from "concurrent-promise-queue";
import {removeNulls} from "../../tools/ArrayNullRemover";
import {variantCardCloner, VariantCloneResponse} from "./VariantCardCLoner";
import {cardItemRetriever} from "../item/CardItemRetriever";
import {SINGLE_POKEMON_CARD_ITEM_TYPE} from "../marketplace/item-details/SinglePokemonCardItemDetails";
import {CardVariant} from "./CardEntity";


const REVERSE_HOLO_RARITIES = new Set<string>([
  'common',
  'uncommon',
  'rare',
  'rare-holo',
])

const cloneForSet = async (setId:string):Promise<Array<VariantCloneResponse>> => {
  const cards = await cardItemRetriever.retrieveBySetId(setId)
  const cardsToClone = cards.filter(card => {
    if (card.itemType !== SINGLE_POKEMON_CARD_ITEM_TYPE) {
      return false
    }
    const itemDetails = card.itemDetails;
    return itemDetails.rarity && REVERSE_HOLO_RARITIES.has(itemDetails.rarity) && itemDetails.variant === CardVariant.DEFAULT
  })
  const queue = new ConcurrentPromiseQueue<VariantCloneResponse>({ maxNumberOfConcurrentPromises: 10 })
  return removeNulls(await Promise.all(
    cardsToClone.map(card => queue.addPromise(() => variantCardCloner.clone(card._id, CardVariant.REVERSE_HOLO)))
  ))
}

export const reverseHoloCardCloner = {
  cloneForSet,
}