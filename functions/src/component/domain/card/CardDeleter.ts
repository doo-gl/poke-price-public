import {ebayCardSearchParamRepository} from "../ebay/search-param/EbayCardSearchParamRepository";
import {cardPriceDataImportAttemptRepository} from "../card-price-data/CardPriceDataImportAttemptRepository";
import {ebayOpenListingRepository} from "../ebay/open-listing/EbayOpenListingRepository";
import {historicalCardPriceRepository} from "../historical-card-price/HistoricalCardPriceRepository";
import {cardPriceStatsRepository} from "../stats/card/CardPriceStatsRepository";
import {cardRepository} from "./CardRepository";
import {cardOwnershipRepository} from "../card-ownership/CardOwnershipRepository";
import {cardCollectionRepository} from "../card-collection/CardCollectionRepository";
import {BatchUpdate} from "../../database/BaseCrudRepository";
import {CardCollectionEntity} from "../card-collection/CardCollectionEntity";
import {collectionVisibilityUpdater} from "../card-collection/CollectionVisibilityUpdater";
import {CardCollectionOwnershipEntity} from "../card-collection/CardCollectionOwnershipEntity";
import {cardCollectionOwnershipRepository} from "../card-collection/CardCollectionOwnershipRepository";
import {cardPriceSelectionRepository} from "../stats/card-v2/CardPriceSelectionEntity";
import {cardStatsRepository} from "../stats/card-v2/CardStatsEntityV2";
import {itemRetriever} from "../item/ItemRetriever";
import {itemRepository, legacyIdOrFallback} from "../item/ItemEntity";
import {collectionStatsUpdater} from "../card-collection/CollectionStatsUpdater";


const deleteSearchParams = async (cardId:string) => {
  const searchParams = await ebayCardSearchParamRepository.getMany([
    { field: "cardId", operation: "==", value: cardId },
  ]);
  await ebayCardSearchParamRepository.batchDelete(searchParams.map(entity => entity.id));
}

const deletePriceImports = async (cardId:string) => {
  const priceImports = await cardPriceDataImportAttemptRepository.getMany([
    { field: "importData.cardId", operation: "==", value: cardId },
  ])
  await cardPriceDataImportAttemptRepository.batchDelete(priceImports.map(entity => entity.id));
}

const deleteOpenListings = async (cardId:string) => {
  const openListings = await ebayOpenListingRepository.getMany([
    { field: "cardId", operation: "==", value: cardId },
  ]);
  await ebayOpenListingRepository.batchDelete(openListings.map(entity => entity.id));
}

const deleteCardPrices = async (cardId:string) => {
  const cardPrices = await historicalCardPriceRepository.getMany([
    { field: "cardId", operation: "==", value: cardId },
  ])
  await historicalCardPriceRepository.batchDelete(cardPrices.map(entity => entity.id));
}

const deleteStats = async (cardId:string) => {
  const stats = await cardPriceStatsRepository.getMany([
    { field: "cardId", operation: "==", value: cardId },
  ])
  await cardPriceStatsRepository.batchDelete(stats.map(entity => entity.id));
}

const deleteOwnerships = async (cardId:string) => {
  const ownerships = await cardOwnershipRepository.getMany([
    { field: "cardId", operation: "==", value: cardId },
  ])
  await cardOwnershipRepository.batchDelete(ownerships.map(entity => entity.id));
}

const deleteCardSelections = async (cardId:string) => {
  const selections = await cardPriceSelectionRepository.getMany([
    { field: "cardId", operation: "==", value: cardId },
  ])
  await cardPriceSelectionRepository.batchDelete(selections.map(entity => entity.id));
}

const deleteCardStatV2 = async (cardId:string) => {
  const stats = await cardStatsRepository.getMany([
    { field: "cardId", operation: "==", value: cardId },
  ])
  await cardStatsRepository.batchDelete(stats.map(entity => entity.id));
}

const updateCollections = async (cardId:string) => {
  const collections = await cardCollectionRepository.getMany([
    { field: "cardIds", operation: "array-contains", value: cardId },
  ]);
  const updates:Array<BatchUpdate<CardCollectionEntity>> = collections.map(collection => {
    return {
      id: collection.id,
      update: {
        cardIds: collection.cardIds.filter(id => id !== cardId),
        visibleCardIds: collection.visibleCardIds.filter(id => id !== cardId),
      },
    }
  })
  await cardCollectionRepository.batchUpdate(updates);
  await Promise.all(collections.map(collection => collectionStatsUpdater.update(collection.id)))
}

const updateCollectionOwnerships = async (cardId:string) => {
  const ownerships = await cardCollectionOwnershipRepository.getMany([
    { field: "ownedCardIds", operation: "array-contains", value: cardId },
  ])
  const updates:Array<BatchUpdate<CardCollectionOwnershipEntity>> = ownerships.map(ownership => {
    return {
      id: ownership.id,
      update: {
        ownedCardIds: ownership.ownedCardIds.filter(id => id !== cardId),
      },
    }
  })
  await cardCollectionOwnershipRepository.batchUpdate(updates)
}

const deleteCard = async (id:string) => {
  const item = await itemRetriever.retrieveOptionalByIdOrLegacyId(id);

  if (!item) {
    return
  }
  const itemId = legacyIdOrFallback(item)

  await deleteSearchParams(itemId)
  await deletePriceImports(itemId)
  await deleteOpenListings(itemId)
  await deleteCardPrices(itemId)
  await deleteStats(itemId)
  await deleteCardStatV2(itemId)
  await deleteCardSelections(itemId)
  await deleteOwnerships(itemId);
  await updateCollections(itemId);
  await updateCollectionOwnerships(itemId);

  await cardRepository.delete(itemId)
  await itemRepository.delete(item._id)
}

export const cardDeleter = {
  deleteCard,
}