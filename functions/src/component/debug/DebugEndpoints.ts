import {Endpoint, Method} from "../infrastructure/express/Endpoint";
import {BASIC_AUTH} from "../infrastructure/Authorization";
import {isProduction} from "../infrastructure/ProductionDecider";
import {UnexpectedError} from "../error/UnexpectedError";
import {testDataImporter} from "./TestDataImporter";
import {ResponseFormat} from "../infrastructure/express/PromiseResponseMapper";
import {ADMIN_ROLE} from "../infrastructure/AdminAuthorization";
import {adminUserRepository} from "../domain/admin/admin-user/AdminUserRepository";
import {appHolder} from "../infrastructure/AppHolder";
import {testGlobalExcludes} from "./TestGlobalExcludes";
import {newsCreator} from "../domain/news/NewsCreator";
import compression from "compression";
import {userSignUpProcessor} from "../domain/user/UserSignUpProcessor";
import {userUpdater} from "../domain/user/UserRepository";
import {MembershipPlan} from "../domain/membership/MembershipStatus";
import {userRetriever} from "../domain/user/UserRetriever";
import {EventContext, logger} from "firebase-functions";
import moment from "moment";
import {ebayListingBackfiller} from "../domain/ebay/open-listing/EbayListingBackfiller";
import {EbayCardSearchParamEntity} from "../domain/ebay/search-param/EbayCardSearchParamEntity";
import {ebayCardSearchParamRepository} from "../domain/ebay/search-param/EbayCardSearchParamRepository";
import {JobCallback} from "../jobs/ScheduledJobCreator";
import {momentToTimestamp, timestampToMoment} from "../tools/TimeConverter";
import {comparatorBuilder} from "../infrastructure/ComparatorBuilder";
import {TaskSupplierBuilder} from "../infrastructure/TaskSupplierBuilder";
import {taskRunner} from "../infrastructure/TaskRunner";
import {ConcurrentPromiseQueue} from "concurrent-promise-queue";
import {cardQueryMetadataPopulator} from "../domain/card/query/CardQueryMetadataPopulator";
import {TimestampStatic} from "../external-lib/Firebase";
import {ebayOpenListingSourcer} from "../domain/ebay/open-listing/EbayOpenListingSourcer";
import {cardSelectionReconciler} from "../domain/stats/card-v2/CardSelectionReconciler";
import {cardStatsCalculator} from "../domain/stats/card-v2/CardStatsCalculator";
import {cardPokePriceUpdater} from "../domain/stats/card-v2/CardPokePriceUpdater";
import {marketplaceListingRepository} from "../domain/marketplace/MarketplaceListingEntity";
import {SearchTag, searchTagRepository, SearchTagType, toTag} from "../domain/search-tag/SearchTagEntity";
import {itemRepository} from "../domain/item/ItemEntity";
import {searchTagReconciller} from "../domain/search-tag/SearchTagReconciller";
import {dedupe} from "../tools/ArrayDeduper";
import {userEventRepository} from "../domain/user/event/UserEventEntity";
import {BaseCrudRepository, SortOrder} from "../database/BaseCrudRepository";
import {Entity} from "../database/Entity";
import {SuperSetSizeEstimation, uuidSuperSetSizeEstimator} from "../tools/UuidSuperSetSizeEstimator";
import {ebayOpenListingRepository} from "../domain/ebay/open-listing/EbayOpenListingRepository";
import {historicalCardStatsRepository} from "../domain/stats/card-v2/HistoricalCardStatsEntity";
import {batchArray} from "../tools/ArrayBatcher";
import {historicalCardPriceRepository} from "../domain/historical-card-price/HistoricalCardPriceRepository";
import {userSessionRepository} from "../domain/user/UserSessionRepository";
import {cardOwnershipRepository} from "../domain/card-ownership/CardOwnershipRepository";
import {cardPriceDataImportAttemptRepository} from "../domain/card-price-data/CardPriceDataImportAttemptRepository";
import {cardQueryViewCountRepository} from "../domain/card/query/CardQueryViewCountEntity";
import {historicalItemPriceRepository} from "../domain/item/historical-item-price/HistoricalItemPriceEntity";
import {inventoryItemRepository} from "../domain/inventory/InventoryItemEntity";
import {portfolioStatsHistoryRepository} from "../domain/portfolio/PortfolioStatsHistoryEntity";
import {aggregateCardOwnershipStatsRepository} from "../domain/card-ownership/stats/AggregateCardOwnershipStatsEntity";
import {siteTrendDataRepository} from "../domain/trends/SiteTrendDataEntity";
import {uuid} from "../external-lib/Uuid";


export const ImportInitialInfo:Endpoint = {
  path: '',
  method: Method.GET,
  auth: BASIC_AUTH,
  requestHandler: async (req, res, next) => {
    if (isProduction()) {
      throw new UnexpectedError(`Not enabled`);
    }

    const app = appHolder.getAdminApp();
    const user = await app.auth().createUser({ email: 'foo@mail.invalid', password: 'foobar!' })
    const adminUser = await adminUserRepository.create({ authId: user.uid, roles: [ADMIN_ROLE] });

    const subscribedUser = await userSignUpProcessor.process({
      email: 'foobarpro@mail.invalid',
      password: 'foobar1',
      acceptedMarketing: true,
      acceptedTerms: true,
      anonymousUserId: null,
      anonymousSessionId: null,
      userAgent: null,
      ipAddress: null,
      origin: null,
    })
    await userUpdater.updateOnly(subscribedUser.user.userId, {
      membership: {
        plans: [MembershipPlan.POKE_PRICE_PRO],
      },
    })

    if (!isProduction()) {
      const items = await itemRepository.getMany({})
      await itemRepository.batchDelete(items.map(item => item._id))

      const listings = await marketplaceListingRepository.getMany({})
      await marketplaceListingRepository.batchDelete(listings.map(listing => listing._id))

      const searchTags = await searchTagRepository.getMany({})
      await searchTagRepository.batchDelete(searchTags.map(tag => tag._id))

      const userEvents = await userEventRepository.getMany({})
      await userEventRepository.batchDelete(userEvents.map(evt => evt._id))

      const aggregateStats = await aggregateCardOwnershipStatsRepository.getMany({})
      await aggregateCardOwnershipStatsRepository.batchDelete(aggregateStats.map(evt => evt._id))

      const trendData = await siteTrendDataRepository.getMany({})
      await siteTrendDataRepository.batchDelete(trendData.map(evt => evt._id))
    }

    await siteTrendDataRepository.createOnly({
      timestamp: new Date(),
      data: {
        lastCalculated: new Date(),
        tagTrends: [],
        collectionTrends: [],
        itemTrends: [],
      },
    })



    await testDataImporter.importData('./test/data/products.json')
    // await testDataImporter.importData('./test/data/webapp-html.json')
    await testGlobalExcludes.create();
    await cardQueryMetadataPopulator.populate();


    await itemRepository.iterator()
      .pageSize(100)
      .iterateBatch(async items => {
        const allSearchTags:Array<SearchTag> = []
        items.forEach(item => {
          item.searchTags.forEach(searchTag => {
            allSearchTags.push(searchTag)
          })
        })
        const dedupedTags = dedupe(allSearchTags, toTag)
        await searchTagReconciller.reconcile(SearchTagType.ITEM, dedupedTags, [])
      })

    await marketplaceListingRepository.iterator()
      .pageSize(100)
      .iterateBatch(async marketplaceListings => {
        const allSearchTags:Array<SearchTag> = []
        marketplaceListings.forEach(marketplaceListing => {
          marketplaceListing.searchTags.forEach(searchTag => {
            allSearchTags.push(searchTag)
          })
        })
        const dedupedTags = dedupe(allSearchTags, toTag)
        await searchTagReconciller.reconcile(SearchTagType.MARKETPLACE_LISTING, dedupedTags, [])
      })


    const proUser = await userRetriever.retrieve(subscribedUser.user.userId)


    await userSignUpProcessor.process({
      email: 'foobar@mail.invalid',
      password: 'foobar1',
      acceptedMarketing: true,
      acceptedTerms: true,
      anonymousUserId: null,
      anonymousSessionId: null,
      userAgent: null,
      ipAddress: null,
      origin: null,
    })

    return {}
  },
}

export const Dev:Endpoint = {
  path: '',
  method: Method.GET,
  auth: BASIC_AUTH,
  preMiddleware: [compression()],
  requestHandler: async (req, res, next) => {

    return {}
  }
  ,
  responseFormat: ResponseFormat.STRING
  ,
}




export const TEMP__BackfillJob:JobCallback = async (context:EventContext|null) => {
  logger.info('Starting backfill')
  await doBackfill()
  logger.info('Finished backfill')
  return Promise.resolve();
}

const doBackfill = async ():Promise<void> => {


  const searchParams = await ebayCardSearchParamRepository.getMany([
    { field: "backfillTime", operation: "<=", value: momentToTimestamp(moment()) },
  ], { limit: 100 })

  const shuffledParams = searchParams
    .map(params => ({sort: Math.random(), value: params}))
    .sort(comparatorBuilder.objectAttributeASC(value => value.sort))
    .map(value => value.value)

  const taskSupplier = new TaskSupplierBuilder<EbayCardSearchParamEntity>()
    .dataName(ebayCardSearchParamRepository.collectionName)
    .idMapper(item => item.id)
    .itemRetriever(async (limit:number) => {
      const items:Array<EbayCardSearchParamEntity> = []
      while (items.length <= limit && shuffledParams.length > 0) {
        const item = shuffledParams.pop()
        if (item) {
          items.push(item)
        }
      }
      return items
    })
    .minItemCount(1)
    .taskMapper(async item => {
      const cardId = item.cardId
      await ebayListingBackfiller.backfill(cardId)
      await ebayOpenListingSourcer.source(cardId)
      await cardSelectionReconciler.reconcileForCard(cardId)
      await cardStatsCalculator.calculateForCard(cardId)
      await cardPokePriceUpdater.update(cardId)
    })
    .build()

  await taskRunner.runFor(
    300,
    2,
    taskSupplier,
    (err) => {
      logger.error(`Error while processing task`, err);
    }
  )

}


export const TEMP_RemoveHistoricalCardStats:JobCallback = async (context:EventContext|null) => {

  await doDeleteHistoricalCardStats()


  return Promise.resolve();
}

const doDeleteHistoricalCardStats = async () => {
  let idsToDelete = new Array<string>()
  let idBatches = new Array<Array<string>>()
  let startAfterId:string|null = null

  await taskRunner.runFor(
    300,
    1,
    async () => {

      return {
        id: startAfterId ?? "NOT AN ID",
        doTask: async () => {
          const entities = await historicalCardStatsRepository.getMany([], {startAfterId: startAfterId ?? undefined, limit: 500})

          idBatches = batchArray(idsToDelete, 500)
          await Promise.all(idBatches.map(async idBatch => {
            await historicalCardStatsRepository.batchDelete(idBatch)
          }))

          idsToDelete = entities.map(ent => ent.id)
          startAfterId = entities.length > 0 ? entities[entities.length - 1].id : null
        },
      }

    },
    (err) => {
      logger.error(`Error while processing task`, err);
    }
  )

  idBatches = batchArray(idsToDelete, 500)
  await Promise.all(idBatches.map(async idBatch => {
    await historicalCardStatsRepository.batchDelete(idBatch)
  }))
}

export const CollectionSizes:Endpoint = {
  path: '',
  method: Method.GET,
  auth: BASIC_AUTH,
  preMiddleware: [compression()],
  requestHandler: async (req, res, next) => {
    if (isProduction()) {
      // throw new UnexpectedError(`Not enabled`);
    }

    const estimateSizeOfCollection = async (repo:BaseCrudRepository<Entity>, sampleSize = 1000):Promise<SuperSetSizeEstimation> => {
      const firstEntities = await repo.getMany([], {sort: [{field: "id", order: SortOrder.ASC}], limit: sampleSize})
      const uuids = firstEntities.map(entity => entity.id)
      return uuidSuperSetSizeEstimator.estimate(uuids)
    }

    const openListingSize = await estimateSizeOfCollection(ebayOpenListingRepository)
    const historicalPriceSize = await estimateSizeOfCollection(historicalCardPriceRepository)
    const userSessionSize = await estimateSizeOfCollection(userSessionRepository)
    const cardOwnershipSize = await estimateSizeOfCollection(cardOwnershipRepository)
    const inventoryItemSize = await estimateSizeOfCollection(inventoryItemRepository)
    const cardPriceDataImportAttemptSize = await estimateSizeOfCollection(cardPriceDataImportAttemptRepository)
    const cardQueryViewCountSize = await estimateSizeOfCollection(cardQueryViewCountRepository)
    const historicalCardStatsSize = await estimateSizeOfCollection(historicalCardStatsRepository)
    const historicalItemPriceSize = await estimateSizeOfCollection(historicalItemPriceRepository)
    const portfolioStatsHistorySize = await estimateSizeOfCollection(portfolioStatsHistoryRepository)

    return {
      openListingSize,
      inventoryItemSize,
      historicalPriceSize,
      userSessionSize,
      cardOwnershipSize,
      cardPriceDataImportAttemptSize,
      cardQueryViewCountSize,
      historicalCardStatsSize,
      historicalItemPriceSize,
      portfolioStatsHistorySize,
    }
  },
}


export const WebappDev:Endpoint = {
  path: '/debug-webapp',
  method: Method.GET,
  auth: BASIC_AUTH,
  preMiddleware: [compression()],
  requestHandler: async (req, res, next) => {
    if (isProduction()) {
      throw new UnexpectedError(`Not enabled`);
    }
    logger.info(`NODE_ENV - ${process.env.NODE_ENV}`)


    return {}
    // return {result}
  }
  ,
  responseFormat: ResponseFormat.STRING
  ,
}






