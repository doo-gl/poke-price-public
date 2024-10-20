import {SetEntity} from "../domain/set/SetEntity";
import {CardEntity} from "../domain/card/CardEntity";
import {HistoricalCardPriceEntity} from "../domain/historical-card-price/HistoricalCardPriceEntity";
import {EbayCardSearchParamEntity} from "../domain/ebay/search-param/EbayCardSearchParamEntity";
import {EbayOpenListingEntity} from "../domain/ebay/open-listing/EbayOpenListingEntity";
import * as FS from "fs";
import {firestoreHolder} from "../database/FirestoreHolder";
import {setRepository} from "../domain/set/SetRepository";
import {cardRepository} from "../domain/card/CardRepository";
import {ebayCardSearchParamRepository} from "../domain/ebay/search-param/EbayCardSearchParamRepository";
import {historicalCardPriceRepository} from "../domain/historical-card-price/HistoricalCardPriceRepository";
import {ebayOpenListingRepository} from "../domain/ebay/open-listing/EbayOpenListingRepository";
import {logger} from "firebase-functions";
import {CardPriceStatsEntity} from "../domain/stats/card/CardPriceStatsEntity";
import {SetPriceStatsEntity} from "../domain/stats/set/SetPriceStatsEntity";
import {cardPriceStatsRepository} from "../domain/stats/card/CardPriceStatsRepository";
import {setPriceStatsRepository} from "../domain/stats/set/SetPriceStatsRepository";
import {CardCollectionEntity} from "../domain/card-collection/CardCollectionEntity";
import {cardCollectionRepository} from "../domain/card-collection/CardCollectionRepository";
import {productRepository} from "../domain/payment/product/ProductRepository";
import {priceRepository} from "../domain/payment/price/PriceRepository";
import {ProductEntity} from "../domain/payment/product/ProductEntity";
import {PriceEntity} from "../domain/payment/price/PriceEntity";
import {webappHtmlRepository} from "../domain/hosting/WebappHtmlRepository";
import {CardStatsEntityV2, cardStatsRepository} from "../domain/stats/card-v2/CardStatsEntityV2";
import {CardPriceSelectionEntity, cardPriceSelectionRepository} from "../domain/stats/card-v2/CardPriceSelectionEntity";
import {PortfolioStatsEntity, portfolioStatsRepository} from "../domain/portfolio/PortfolioStatsEntity";
import {
  PortfolioStatsHistoryEntity,
  portfolioStatsHistoryRepository,
} from "../domain/portfolio/PortfolioStatsHistoryEntity";
import {CardOwnershipEntity} from "../domain/card-ownership/CardOwnershipEntity";
import {InventoryItemEntity, inventoryItemRepository} from "../domain/inventory/InventoryItemEntity";
import {CardCollectionOwnershipEntity} from "../domain/card-collection/CardCollectionOwnershipEntity";
import {cardOwnershipRepository} from "../domain/card-ownership/CardOwnershipRepository";
import {cardCollectionOwnershipRepository} from "../domain/card-collection/CardCollectionOwnershipRepository";
import {UserEntity} from "../domain/user/UserEntity";
import {firebaseLogInManager} from "../domain/user/FirebaseLogInManager";
import {userRepository} from "../domain/user/UserRepository";
import {UserSessionEntity} from "../domain/user/UserSessionEntity";
import {userSessionRepository} from "../domain/user/UserSessionRepository";
import {ConcurrentPromiseQueue} from "concurrent-promise-queue";
import {batchArray} from "../tools/ArrayBatcher";
import {TimestampStatic} from "../external-lib/Firebase";
import {ItemEntity, itemRepository} from "../domain/item/ItemEntity";
import {mongoConnectionManager} from "../database/mongo/MongoConnectionManager";
import {ObjectId} from "mongodb";
import {MarketplaceListingEntity, marketplaceListingRepository} from "../domain/marketplace/MarketplaceListingEntity";
import moment from "moment";
import {
  PokemonTcgApiPriceHistoryEntity, pokemonTcgApiPriceHistoryRepository,
} from "../domain/pokemon-tcg-api-v2/price-scraping/PokemonTcgApiPriceHistoryEntity";
import {aggregateCardOwnershipStatsRepository} from "../domain/card-ownership/stats/AggregateCardOwnershipStatsEntity";
import {ItemPriceHistoryEntity, itemPriceHistoryRepository} from "../domain/item/price-history/ItemPriceHistoryEntity";

export interface TestDataImport {
  sets?:Array<SetEntity>,
  set?:SetEntity,
  card?:CardEntity,
  cards?:Array<CardEntity>,
  item?:ItemEntity,
  items?:Array<ItemEntity>,
  marketplaceListings?:Array<MarketplaceListingEntity>,
  prices?:Array<HistoricalCardPriceEntity>
  searchParams?:Array<EbayCardSearchParamEntity>,
  openListings?:Array<EbayOpenListingEntity>,
  cardPriceStats?:Array<CardPriceStatsEntity>,
  setPriceStats?:Array<SetPriceStatsEntity>,
  collections?:Array<CardCollectionEntity>,
  'stripe-product'?:Array<ProductEntity>,
  'stripe-price'?:Array<PriceEntity>,
  cardStatsV2?:Array<CardStatsEntityV2>,
  cardSelections?:Array<CardPriceSelectionEntity>,
  portfolioStats?:Array<PortfolioStatsEntity>,
  portfolioStatsHistory?:Array<PortfolioStatsHistoryEntity>,
  cardOwnerships?:Array<CardOwnershipEntity>,
  inventoryItems?:Array<InventoryItemEntity>,
  collectionOwnerships?:Array<CardCollectionOwnershipEntity>,
  users?:Array<UserEntity>,
  userSessions?:Array<UserSessionEntity>
  tcgApiPriceHistories?:Array<PokemonTcgApiPriceHistoryEntity>,
  itemPriceHistory?:Array<ItemPriceHistoryEntity>,
}

let importCount = 0;

const convertToMongoObject = (json:any):any => {
  if (json === null) {
    return null;
  }
  if (json === undefined) {
    return undefined;
  }

  if (typeof json === "string" && json.match(new RegExp("\\d\\d\\d\\d-\\d\\d-\\d\\dT\\d\\d:\\d\\d:\\d\\d\\.\\d\\d\\dZ"))) {
    return moment(json).toDate()
  }

  if (json._seconds !== undefined && json._nanoseconds !== undefined) {
    const millis = (json._seconds * 1000) + (json._nanoseconds / 1000);
    return new Date(millis)
  }

  if (Array.isArray(json)) {
    return json.map(val => convertToMongoObject(val));
  }

  if (typeof json === 'object') {
    const result:any = {};
    Object.entries(json).forEach((entry) => {
      const key = entry[0];
      const value:any = entry[1];

      if (key === '_id') {
        result[key] = new ObjectId(value)
      } else {
        result[key] = convertToMongoObject(value);
      }
    })
    return result;
  }

  return json;
}

const convertToFirebaseObject = (json:any):any => {
  if (json === null) {
    return null;
  }
  if (json === undefined) {
    return undefined;
  }

  if (json._seconds !== undefined && json._nanoseconds !== undefined) {
    const millis = (json._seconds * 1000) + (json._nanoseconds / 1000);
    return TimestampStatic.fromMillis(millis);
  }

  if (Array.isArray(json)) {
    return json.map(val => convertToFirebaseObject(val));
  }

  if (typeof json === 'object') {
    const result:any = {};
    Object.entries(json).forEach((entry) => {
      const key = entry[0];
      const value:any = entry[1];
      result[key] = convertToFirebaseObject(value);
    })
    return result;
  }

  return json;
}

const addToMongo = async (collectionName:string, value:any):Promise<void> => {
  const connection = await mongoConnectionManager.getConnection()
  const collection = connection.db.collection(collectionName)
  if (Array.isArray(value)) {
    const batchedValues = batchArray(value, 200)
    const batchQueue = new ConcurrentPromiseQueue({ maxNumberOfConcurrentPromises: 1 })
    await Promise.all(
      batchedValues.map(async valueBatch => {
        await batchQueue.addPromise(async () => {
          const convertedValues = valueBatch.map(val => convertToMongoObject(val))
          const bulkResult = await collection.insertMany(convertedValues)
          importCount += bulkResult.insertedCount
          logger.info(`Imported object ${importCount}, collection: ${collectionName}`)
        })
      })
    )

    return;
  }
  importCount++;
  if (importCount % 200 === 0) {
    logger.info(`Importing object ${importCount}, collection: ${collectionName}`)
  }
  const convertedValue = convertToMongoObject(value);
  await collection.insertOne(convertedValue)
}

const addToFirebase = async (collectionName:string, value:any):Promise<void> => {
  if (Array.isArray(value)) {
    const batchedValues = batchArray(value, 200)
    const batchQueue = new ConcurrentPromiseQueue({ maxNumberOfConcurrentPromises: 1 })
    await Promise.all(
      batchedValues.map(async valueBatch => {
        // const queue = new ConcurrentPromiseQueue({ maxNumberOfConcurrentPromises: 10 })
        // await batchQueue.addPromise(async () => {
        //   await Promise.all(
        //     batch.map(val => queue.addPromise(() => addToFirebase(collectionName, val))),
        //   )
        // })

        await batchQueue.addPromise(async () => {
          const convertedValues = valueBatch.map(val => convertToFirebaseObject(val))
          const firestoreDB = firestoreHolder.get();
          const batch = firestoreDB.batch();
          convertedValues.forEach(val => {
            importCount++;
            if (importCount % 200 === 0) {
              logger.info(`Importing object ${importCount}, collection: ${collectionName}`)
            }
            const ref = firestoreDB.collection(collectionName).doc(val.id)
            batch.create(ref, val)
          })
          await batch.commit()
        })
      })
    )



    return;
  }
  importCount++;
  if (importCount % 200 === 0) {
    logger.info(`Importing object ${importCount}, collection: ${collectionName}`)
  }
  const convertedValue = convertToFirebaseObject(value);
  const store = firestoreHolder.get();
  await store.collection(collectionName)
    .doc(value.id)
    .set(convertedValue)
}

const maybeAddToFirebase = async (collectionName:string, value:any):Promise<void> => {
  if (!value) {
    return;
  }
  return addToFirebase(collectionName, value)
}

const maybeAddToMongo = async (collectionName:string, value:any):Promise<void> => {
  if (!value) {
    return;
  }
  return addToMongo(collectionName, value)
}



const addUsers = async (value:any):Promise<void> => {
  if (!value) {
    return
  }
  if (!Array.isArray(value)) {
    throw new Error(`Expecting users array`)
  }
  const users = (<Array<UserEntity>>value)
  await Promise.all(
    users.map(async user => {
      const userCredential = await firebaseLogInManager.signUpWithEmailAndPassword(`${user.id}@mail.invalid`, 'foobar1')
      if (!userCredential.user) {
        throw new Error(`Failed to create user ${user.id}`)
      }
      user.firebaseUserIds = [userCredential.user.uid]
      await addToFirebase(userRepository.collectionName, user)
    })
  )
}

const importData = async (filePath:string):Promise<void> => {
  logger.info(`Importing: ${filePath}`)
  const rawData = FS.readFileSync(filePath);
  const json = JSON.parse(rawData.toString());
  await maybeAddToFirebase(setRepository.collectionName, json.sets);
  await maybeAddToFirebase(setRepository.collectionName, json.set);
  await maybeAddToFirebase(cardRepository.collectionName, json.card);
  await maybeAddToFirebase(cardRepository.collectionName, json.cards);
  await maybeAddToFirebase(historicalCardPriceRepository.collectionName, json.prices);
  await maybeAddToFirebase(ebayCardSearchParamRepository.collectionName, json.searchParams);
  await maybeAddToFirebase(ebayOpenListingRepository.collectionName, json.openListings);
  await maybeAddToFirebase(cardPriceStatsRepository.collectionName, json.cardPriceStats);
  await maybeAddToFirebase(setPriceStatsRepository.collectionName, json.setPriceStats);
  await maybeAddToFirebase(cardCollectionRepository.collectionName, json.collections);
  await maybeAddToFirebase(productRepository.collectionName, json['stripe-product']);
  await maybeAddToFirebase(priceRepository.collectionName, json['stripe-price']);
  await maybeAddToFirebase(webappHtmlRepository.collectionName, json['webapp-html']);
  await maybeAddToFirebase(cardStatsRepository.collectionName, json.cardStatsV2);
  await maybeAddToFirebase(cardPriceSelectionRepository.collectionName, json.cardSelections);
  await maybeAddToFirebase(portfolioStatsRepository.collectionName, json.portfolioStats);
  await maybeAddToFirebase(portfolioStatsHistoryRepository.collectionName, json.portfolioStatsHistory);
  await maybeAddToFirebase(cardOwnershipRepository.collectionName, json.cardOwnerships);
  await maybeAddToFirebase(cardCollectionOwnershipRepository.collectionName, json.collectionOwnerships);
  await maybeAddToFirebase(inventoryItemRepository.collectionName, json.inventoryItems);
  await maybeAddToFirebase(userSessionRepository.collectionName, json.userSessions);
  await maybeAddToFirebase(pokemonTcgApiPriceHistoryRepository.collectionName, json.tcgApiPriceHistories);
  await maybeAddToFirebase(itemPriceHistoryRepository.collectionName, json.itemPriceHistory);
  await maybeAddToMongo(itemRepository.collectionName, json.item)
  await maybeAddToMongo(itemRepository.collectionName, json.items)
  await maybeAddToMongo(marketplaceListingRepository.collectionName, json.marketplaceListings)
  await maybeAddToMongo(aggregateCardOwnershipStatsRepository.collectionName, json.aggregateOwnershipStats)
  await addUsers(json.users)
  importCount = 0;
}

export const testDataImporter = {
  importData,
}