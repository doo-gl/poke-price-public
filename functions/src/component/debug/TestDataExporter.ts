import {TestDataImport} from "./TestDataImporter";
import {cardRetriever} from "../domain/card/CardRetriever";
import {setRetriever} from "../domain/set/SetRetriever";
import {historicalCardPriceRepository} from "../domain/historical-card-price/HistoricalCardPriceRepository";
import {ebayCardSearchParamRepository} from "../domain/ebay/search-param/EbayCardSearchParamRepository";
import {cardPriceStatsRepository} from "../domain/stats/card/CardPriceStatsRepository";
import {ebayOpenListingRepository} from "../domain/ebay/open-listing/EbayOpenListingRepository";
import {setPriceStatsRepository} from "../domain/stats/set/SetPriceStatsRepository";
import {cardCollectionRepository} from "../domain/card-collection/CardCollectionRepository";
import {productRepository} from "../domain/payment/product/ProductRepository";
import {priceRepository} from "../domain/payment/price/PriceRepository";
import {cardStatsRetrieverV2} from "../domain/stats/card-v2/CardStatsRetriever";
import {cardPriceSelectionRetriever} from "../domain/stats/card-v2/CardPriceSelectionRetriever";
import {cardStatsRepository} from "../domain/stats/card-v2/CardStatsEntityV2";
import {cardPriceSelectionRepository} from "../domain/stats/card-v2/CardPriceSelectionEntity";
import {inventoryItemRepository} from "../domain/inventory/InventoryItemEntity";
import {cardOwnershipRepository} from "../domain/card-ownership/CardOwnershipRepository";
import {cardCollectionOwnershipRepository} from "../domain/card-collection/CardCollectionOwnershipRepository";
import {cardRepository} from "../domain/card/CardRepository";
import {portfolioStatsRepository} from "../domain/portfolio/PortfolioStatsEntity";
import {portfolioStatsHistoryRepository} from "../domain/portfolio/PortfolioStatsHistoryEntity";
import {UserEntity} from "../domain/user/UserEntity";
import {uuid} from "../external-lib/Uuid";
import {MembershipPlan} from "../domain/membership/MembershipStatus";
import {userSessionRepository} from "../domain/user/UserSessionRepository";
import {TimestampStatic} from "../external-lib/Firebase";
import {flattenArray} from "../tools/ArrayFlattener";
import {cardCollectionRetriever} from "../domain/card-collection/CardCollectionRetriever";
import {removeNulls} from "../tools/ArrayNullRemover";
import {itemRetriever} from "../domain/item/ItemRetriever";
import {SINGLE_POKEMON_CARD_ITEM_TYPE} from "../domain/marketplace/item-details/SinglePokemonCardItemDetails";
import {SingleCardItemDetails} from "../domain/item/ItemEntity";
import moment from "moment";
import {marketplaceListingRepository} from "../domain/marketplace/MarketplaceListingEntity";
import {cardItemRetriever} from "../domain/item/CardItemRetriever";
import {
  pokemonTcgApiPriceHistoryRepository,
} from "../domain/pokemon-tcg-api-v2/price-scraping/PokemonTcgApiPriceHistoryEntity";


const exportDataForCard = async (itemId:string):Promise<TestDataImport> => {
  const item = await itemRetriever.retrieveByIdOrLegacyId(itemId);
  const legacyOrItemId = item.legacyId ?? item._id.toString()
  const marketplaceListings = await marketplaceListingRepository.getMany({itemId: legacyOrItemId}, {limit: 50})
  const openListingIds = marketplaceListings.map(listing => listing.listingId)


  const prices = await historicalCardPriceRepository.getMany([{ field: "cardId", operation: "==", value: legacyOrItemId }], {limit: 50});
  const openListings = await ebayOpenListingRepository.getManyById(openListingIds)
  const searchParams = await ebayCardSearchParamRepository.getMany([{ field: "cardId", operation: "==", value: legacyOrItemId }]);
  const cardPriceStats = await cardPriceStatsRepository.getMany([{ field: "cardId", operation: "==", value: legacyOrItemId }])
  const cardStatsV2 = await cardStatsRepository.getMany([{ field: "cardId", operation: "==", value: legacyOrItemId }])
  const cardSelections = await cardPriceSelectionRepository.getMany([{ field: "cardId", operation: "==", value: legacyOrItemId }])
  const tcgApiPriceHistories = await pokemonTcgApiPriceHistoryRepository.getMany([{ field: "itemId", operation: "==", value: item._id.toString() }], {limit: 50})

  let set = undefined
  let setPriceStats = undefined
  if (item.itemType === SINGLE_POKEMON_CARD_ITEM_TYPE) {
    const card = item.itemDetails as SingleCardItemDetails
    set = await setRetriever.retrieve(card.setId);
    setPriceStats = await setPriceStatsRepository.getMany([{ field: "setId", operation: "==", value: set.id }])
  }

  return {
    item,
    set,
    prices: prices.filter(obj => moment(obj.dateCreated.toDate()).isAfter(moment().subtract(30, 'days'))).slice(0, 30),
    openListings,
    marketplaceListings,
    searchParams,
    cardPriceStats,
    setPriceStats,
    cardStatsV2,
    cardSelections,
    tcgApiPriceHistories,

  }
}

const exportDataForSet = async (setId:string):Promise<TestDataImport> => {
  const set = await setRetriever.retrieve(setId);
  const cards = await cardItemRetriever.retrieveBySetId(setId);
  const collection = await cardCollectionRetriever.retrieveByIdempotencyKey(setId)
  return {
    set,
    items: cards,
    collections: collection ? [collection] : undefined,
  }
}

const exportDataForSetWithItem = async (setId:string, itemId:string) => {
  const item = await exportDataForCard(itemId)
  const set = await exportDataForSets([setId])
  delete item.item
  delete item.set
  return {
    ...item,
    ...set,
  }
}

const exportDataForSets = async (setIds:Array<string>):Promise<TestDataImport> => {
  const sets = await setRetriever.retrieveByIds(setIds);
  const parentCollections = removeNulls(await Promise.all(setIds.map(setId => cardCollectionRetriever.retrieveByIdempotencyKey(setId))))
  const collections = parentCollections.concat(flattenArray(await Promise.all(parentCollections.map(parent => cardCollectionRetriever.retrieveDescendants(parent.id)))))
  const cards = flattenArray(await Promise.all(setIds.map(setId => cardItemRetriever.retrieveBySetId(setId))))
  return {
    sets,
    items: cards,
    collections,
  }
}

const exportStatsForCard = async (cardId:string):Promise<TestDataImport> => {
  const stats = await cardStatsRetrieverV2.retrieveForCardId(cardId);
  const selections = await cardPriceSelectionRetriever.retrieveForCardId(cardId);
  return {
    cardStatsV2: stats,
    cardSelections: selections,
  }
}

const exportCollections = async ():Promise<TestDataImport> => {
  const collections = await cardCollectionRepository.getMany([]);
  return { collections }
}

const exportProducts = async ():Promise<TestDataImport> => {
  const products = await productRepository.getMany([]);
  const prices = await priceRepository.getMany([]);
  return {
    "stripe-product": products,
    "stripe-price": prices,
  }
}

const updateUserIds = <T extends {userId:string}>(values:Array<T>, newUserId:string):Array<T> => {
  return values.map(value => updateUserId(value, newUserId))
}

const updateUserId = <T extends {userId:string}>(value:T, newUserId:string):T => {
  value.userId = newUserId
  return value
}

const fakeUser = (newUserId:string):UserEntity => {
  return {
    id: newUserId,
    dateCreated: TimestampStatic.now(),
    dateLastModified: TimestampStatic.now(),
    details: {
      displayName: `USER_${newUserId}`,
      email: `${newUserId}@mail.invalid`,
      photoUrl: null,
    },
    stripeDetails: null,
    firebaseUserIds: null,
    facebookUserId: null,
    membership: { plans: [MembershipPlan.POKE_PRICE_PRO] },
    parentUserId: null,
    mostRecentSessionId: null,
    terms: null,
  }
}

const exportUserPortfolio = async (userId:string):Promise<TestDataImport> => {
  const newUserId = uuid()
  const inventoryItems = await inventoryItemRepository.getMany([{ field: "userId", operation: "==", value: userId }])
  const ownerships = await cardOwnershipRepository.getMany([{ field: "userId", operation: "==", value: userId }])
  const collectionOwnerships = await cardCollectionOwnershipRepository.getMany([{ field: "userId", operation: "==", value: userId }])
  const portfolioStats = await portfolioStatsRepository.getMany([{ field: "userId", operation: "==", value: userId }]);
  const portfolioStatsHistory = await portfolioStatsHistoryRepository.getMany([{ field: "userId", operation: "==", value: userId }]);
  const cardIds = new Set<string>()
  inventoryItems.forEach(inventoryItem => cardIds.add(inventoryItem.itemId))
  const collectionIds = new Set<string>()
  collectionOwnerships.forEach(collection => collectionIds.add(collection.cardCollectionId))
  const cards = await cardRepository.getManyById([...cardIds])
  const collections = await cardCollectionRepository.getManyById([...collectionIds])

  const sessions = await userSessionRepository.getMany([{ field: "userId", operation: "==", value: userId }])
  sessions.forEach(session => {
    session.ipAddress = null
    session.userAgent = null
    session.origin = null
  })

  const user:UserEntity = fakeUser(newUserId)

  return {
    cards: cards,
    collections: collections,
    cardOwnerships: updateUserIds(ownerships, newUserId),
    collectionOwnerships: updateUserIds(collectionOwnerships, newUserId),
    inventoryItems: updateUserIds(inventoryItems, newUserId),
    portfolioStats: updateUserIds(portfolioStats, newUserId),
    portfolioStatsHistory: updateUserIds(portfolioStatsHistory, newUserId),
    userSessions: updateUserIds(sessions, newUserId),
    users: [user],
  }
}



export const testDataExporter = {
  exportDataForCard,
  exportDataForSetWithItem,
  exportDataForSet,
  exportDataForSets,
  exportCollections,
  exportProducts,
  exportStatsForCard,
  exportUserPortfolio,
}

