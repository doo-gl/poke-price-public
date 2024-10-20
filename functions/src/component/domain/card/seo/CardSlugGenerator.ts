import {CardEntity, CardVariant} from "../CardEntity";
import {convertToKey} from "../../../tools/KeyConverter";
import {cardRepository} from "../CardRepository";
import {BatchUpdate} from "../../../database/BaseCrudRepository";
import {BatchUpdate as MongoBatchUpdate} from "../../../database/mongo/MongoEntity";
import {ItemEntity, itemRepository, SingleCardItemDetails} from "../../item/ItemEntity";
import {uuid} from "../../../external-lib/Uuid";
import {SINGLE_POKEMON_CARD_ITEM_TYPE} from "../../marketplace/item-details/SinglePokemonCardItemDetails";
import {GENERIC_ITEM_TYPE, GenericItemDetails} from "../../marketplace/item-details/GenericItemDetails";

export interface CardSlugDetails {
  id:string,
  set:string,
  name:string,
  numberInSet:string,
  variant:CardVariant,
  displaySetNumber:string,
}

const generate = (details:CardSlugDetails) => {
  const {
    id,
    set,
    name,
    numberInSet,
    displaySetNumber,
    variant,
  } = details;
  const idPrefix = id.slice(0, id.indexOf('-'))
  const variantKey = variant === CardVariant.DEFAULT ? '' : `-${convertToKey(variant)}`
  return `${convertToKey(name)}-${convertToKey(numberInSet)}-${convertToKey(displaySetNumber)}-${convertToKey(set)}${variantKey}--${idPrefix}`
}

const generateSlugForItem = (item:ItemEntity, slugSuffixId:string):string => {
  if (item.itemType === SINGLE_POKEMON_CARD_ITEM_TYPE) {
    const cardDetails = <SingleCardItemDetails>item.itemDetails;
    return cardSlugGenerator.generate({
      id: `${slugSuffixId}-`,
      name: item.name,
      set: cardDetails.set,
      numberInSet: cardDetails.cardNumber,
      displaySetNumber: cardDetails.setNumber,
      variant: cardDetails.variant,
    })
      .replace(/é/gim, 'e')
  }
  if (item.itemType === GENERIC_ITEM_TYPE) {
    const genericDetails = <GenericItemDetails>item.itemDetails;
    const slugExtension = genericDetails.slugExtension;
    return `${convertToKey(item.name)}${slugExtension ? `-${slugExtension}`: ''}-${slugSuffixId}`
      .replace(/é/gim, 'e')
  }
  return `${convertToKey(item.name)}-${slugSuffixId}`
    .replace(/é/gim, 'e')
}

const generateForAll = async () => {

  await cardRepository.iterator()
    .iterateBatch(async cards => {
      const updates:Array<BatchUpdate<CardEntity>> = [];
      cards.forEach(card => {
        const newSlug = generate(card);
        const oldSlug = card.slug;
        let oldSlugs = card.slugs ?? [];
        if (oldSlug) {
          oldSlugs = [oldSlug].concat(oldSlugs.filter(slug => slug !== oldSlug))
        }
        const slugs = [newSlug].concat(oldSlugs);
        const update:BatchUpdate<CardEntity> = {
          id: card.id,
          update: {
            slug: newSlug,
            slugs,
          },
        }
        updates.push(update)
      })
      await cardRepository.batchUpdate(updates)
    })
}

const generateForItems = async (items:Array<ItemEntity>):Promise<Array<string>> => {
  const updates:Array<MongoBatchUpdate<ItemEntity>> = []

  items.forEach(item => {
    const fallbackId = uuid()
    const slugSuffixId = item.slugSuffixId ?? fallbackId.slice(0, fallbackId.indexOf('-'))
    const newSlug = generateSlugForItem(item, slugSuffixId)
    const oldSlug = item.slug;
    if (newSlug === oldSlug) {
      return
    }
    let oldSlugs = item.slugs ?? [];
    if (oldSlug) {
      oldSlugs = [oldSlug].concat(oldSlugs.filter(slug => slug !== oldSlug))
    }
    const slugs = [newSlug].concat(oldSlugs);
    updates.push({
      id: item._id,
      update: {slug: newSlug, slugs, slugSuffixId},
    })
  })

  await itemRepository.batchUpdate(updates)
  return updates.map(update => update.id.toString())
}

export const cardSlugGenerator = {
  generate,
  generateForAll,
  generateForItems,
}