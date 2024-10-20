import {Create, Update} from "../../database/mongo/MongoEntity";
import {baseItemCreator, ItemEntity, itemUpdater} from "./ItemEntity";
import {lodash} from "../../external-lib/Lodash";


const calculateUpdate = (newItem:Create<ItemEntity>, preExistingItem:ItemEntity):Update<ItemEntity>|null => {
  const update:Update<ItemEntity> = {};

  // if (newItem.slug !== preExistingItem.slug) {
  //   update.slug = newItem.slug;
  // }
  // if (newItem.slugs !== preExistingItem.slugs) {
  //   update.slugs = newItem.slugs;
  // }
  // if (newItem.visible !== preExistingItem.visible) {
  //   update.visible = newItem.visible;
  // }
  if (newItem.name !== preExistingItem.name) {
    update.name = newItem.name;
  }
  if (newItem.displayName !== preExistingItem.displayName) {
    update.displayName = newItem.displayName;
  }
  if (newItem.description !== preExistingItem.description) {
    update.description = newItem.description;
  }
  // if (lodash.isNotEqual(newItem.searchKeywords, preExistingItem.searchKeywords)) {
  //   update.searchKeywords = newItem.searchKeywords;
  // }
  if (lodash.isNotEqual(newItem.identifiers, preExistingItem.identifiers)) {
    update.identifiers = newItem.identifiers;
  }
  if (newItem.itemType !== preExistingItem.itemType) {
    update.itemType = newItem.itemType;
  }
  if (lodash.isNotEqual(newItem.itemDetails, preExistingItem.itemDetails)) {
    update.itemDetails = newItem.itemDetails;
  }

  if (newItem.nextPokePriceCalculationTime.getTime() !== preExistingItem.nextPokePriceCalculationTime.getTime()) {
    update.nextPokePriceCalculationTime = newItem.nextPokePriceCalculationTime;
  }
  if (newItem.nextStatsCalculationTime.getTime() !== preExistingItem.nextStatsCalculationTime.getTime()) {
    update.nextStatsCalculationTime = newItem.nextStatsCalculationTime;
  }
  if (newItem.nextEbayOpenListingSourcingTime.getTime() !== preExistingItem.nextEbayOpenListingSourcingTime.getTime()) {
    update.nextEbayOpenListingSourcingTime = newItem.nextEbayOpenListingSourcingTime;
  }

  if (lodash.isNotEqual(newItem.images, preExistingItem.images)) {
    update.images = newItem.images;
  }
  // if (lodash.isNotEqual(newItem.itemPrices, preExistingItem.itemPrices)) {
  //   update.itemPrices = newItem.itemPrices;
  // }
  if (lodash.isNotEqual(newItem.metadata, preExistingItem.metadata)) {
    update.metadata = newItem.metadata;
  }
  if (lodash.isNotEqual(newItem.tags, preExistingItem.tags)) {
    update.tags = newItem.tags;
  }
  if (lodash.isNotEqual(newItem.searchTags, preExistingItem.searchTags)) {
    update.searchTags = newItem.searchTags;
  }
  // if (lodash.isNotEqual(newItem.relatedItems, preExistingItem.relatedItems)) {
  //   update.relatedItems = newItem.relatedItems;
  // }
  // if (lodash.isNotEqual(newItem.nextItem, preExistingItem.nextItem)) {
  //   update.nextItem = newItem.nextItem;
  // }
  // if (lodash.isNotEqual(newItem.previousItem, preExistingItem.previousItem)) {
  //   update.previousItem = newItem.previousItem;
  // }

  if (Object.keys(update).length === 0) {
    return null;
  }
  return update
}

const upsert = async (create:Create<ItemEntity>, preExistingItem:ItemEntity|null):Promise<ItemEntity> => {
  if (!preExistingItem) {
    return await baseItemCreator.create(create)
  }
  const updateDetails = calculateUpdate(create, preExistingItem)
  if (updateDetails) {
    return itemUpdater.updateAndReturn(preExistingItem._id, updateDetails)
  }
  return preExistingItem;
}

export const itemUpserter = {
  upsert,
}