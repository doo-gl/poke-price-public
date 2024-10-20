import {Endpoint} from "../../infrastructure/express/Endpoint";
import {DomainEndpointBuilder} from "./DomainEndpointBuilder";
import {DomainEndpointBuilder as MongoDomainEndpointBuilder} from "./mongo/MongoDomainEndpointBuilder";
import {CardVariant} from "../card/CardEntity";
import {SetEntity} from "../set/SetEntity";
import {SetDto} from "../set/SetDto";
import {setRepository} from "../set/SetRepository";
import {setDtoMapper} from "../set/SetDtoMapper";
import {HistoricalCardPriceEntity} from "../historical-card-price/HistoricalCardPriceEntity";
import {HistoricalCardPriceDto} from "../historical-card-price/HistoricalCardPriceDto";
import {historicalCardPriceRepository} from "../historical-card-price/HistoricalCardPriceRepository";
import {historicalCardPriceDtoMapper} from "../historical-card-price/HistoricalCardPriceDtoMapper";
import {momentToTimestamp} from "../../tools/TimeConverter";
import moment from "moment";
import {CardDataSource} from "../card/CardDataSource";
import {PriceDataType} from "../historical-card-price/PriceDataType";
import {CacheEntryEntity} from "../../database/cache/CacheEntryEntity";
import {CacheEntryDto} from "../../database/cache/CacheEntryDto";
import {cacheRepository} from "../../database/cache/CacheRepository";
import {cacheEntryDtoMapper} from "../../database/cache/CacheEntryDtoMapper";
import {CardPriceDataImportAttemptEntity, ImportType} from "../card-price-data/CardPriceDataImportAttemptEntity";
import {cardPriceDataImportAttemptRepository} from "../card-price-data/CardPriceDataImportAttemptRepository";
import {CardPriceDataImportAttemptDto} from "../card-price-data/CardPriceDataImportAttemptDto";
import {cardPriceDataImportAttemptDtoMapper} from "../card-price-data/CardPriceDataImportAttemptDtoMapper";
import {LoadingState} from "../../constants/LoadingState";
import {CardPriceStatsEntity} from "../stats/card/CardPriceStatsEntity";
import {CardStatsDtoV2, CardStatsEntityV2, cardStatsRepository} from "../stats/card-v2/CardStatsEntityV2";
import {CardPriceStatsDto} from "../stats/card/CardPriceStatsDto";
import {cardPriceStatsRepository} from "../stats/card/CardPriceStatsRepository";
import {cardPriceStatsDtoMapper} from "../stats/card/CardPriceStatsDtoMapper";
import {MigrationEntity} from "../../database/migration/MigrationEntity";
import {MigrationDto} from "../../database/migration/MigrationDto";
import {migrationRepository} from "../../database/migration/MigrationRepository";
import {migrationDtoMapper} from "../../database/migration/MigrationDtoMapper";
import {EbayCardSearchParamEntity} from "../ebay/search-param/EbayCardSearchParamEntity";
import {EbayCardSearchParamDto} from "../ebay/search-param/EbaySearchParamDto";
import {ebayCardSearchParamRepository} from "../ebay/search-param/EbayCardSearchParamRepository";
import {ebaySearchParamDtoMapper} from "../ebay/search-param/EbaySearchParamDtoMapper";
import {NewsEntity} from "../news/NewsEntity";
import {NewsDto} from "../news/NewsDto";
import {newsRepository} from "../news/NewsRepository";
import {newsDtoMapper} from "../news/NewsDtoMapper";
import {SetPriceStatsEntity} from "../stats/set/SetPriceStatsEntity";
import {SetPriceStatsDto} from "../stats/set/SetPriceStatsDto";
import {setPriceStatsRepository} from "../stats/set/SetPriceStatsRepository";
import {setPriceStatsDtoMapper} from "../stats/set/SetPriceStatsDtoMapper";
import {
  AdminCreateCard,
  AdminRecalculateStatsForCard,
  AdminUpdateImageForCard,
  AdminUpdateKeywordsForCard,
  AdminUpdateVisibilityForCard, BackfillCard,
  BackfillEbayListings,
  DownloadCardTestData,
  SourceOpenListings,
  SubmitEbayListHtml,
} from "./AdminCardEndpoints";
import {ebayCardSearchParamCreator} from "../ebay/search-param/EbayCardSearchParamCreator";
import {EbayOpenListingEntity} from "../ebay/open-listing/EbayOpenListingEntity";
import {EbayOpenListingDto} from "../ebay/open-listing/EbayOpenListingDto";
import {ebayOpenListingRepository} from "../ebay/open-listing/EbayOpenListingRepository";
import {ebayOpenListingDtoMapper} from "../ebay/open-listing/EbayOpenListingDtoMapper";
import {AdminReconcileListingsForSearch} from "./AdminSearchParamEndpoints";
import {newsCreator} from "../news/NewsCreator";
import {newsUpdater} from "../news/NewsUpdater";
import {AdminActivatePrice, AdminDeactivatePrice} from "./AdminCardPriceEndpoints";
import {
  CardPriceSelectionDto,
  CardPriceSelectionEntity,
  cardPriceSelectionRepository,
} from "../stats/card-v2/CardPriceSelectionEntity";
import {cardSelectionMapper} from "../stats/card-v2/CardSelectionMapper";
import {cardStatsMapper} from "../stats/card-v2/CardStatsMapper";
import {
  AdminGetCardSearchParamCsv,
  AdminGetListingsEndingSoonCsv,
  AdminGetTopBuyingOpportunitiesCsv,
} from "./AdminCsvEndpoints";
import {AdminCreateSet} from "./AdminSetEndpoints";
import {AdminArchiveOpenListing} from "./AdminOpenListingEndpoints";
import {
  cardListAliasCreator,
  CardListAliasEntity,
  cardListAliasRepository,
  cardListAliasUpdater,
  createCardListAliasSchema,
  updateCardListAliasSchema,
} from "../card/seo/alias/CardListAliasEntity";
import {CardListAliasDto, cardListAliasMapper} from "../card/seo/alias/CardListAliasMapper";
import {updateFunctionBuilder} from "./UpdateFunctionBuilder";
import {createFunctionBuilder} from "./CreateFunctionBuilder";
import {ItemEntity, itemRepository, itemUpdater} from "../item/ItemEntity";
import {ObjectId} from "mongodb";
import {AdminItemDto, adminItemMapper} from "../item/AdminItemMapper";
import {AdminBulkCsvCreateItem, AdminGetSealedItemsCsv} from "./AdminItemEndpoints";
import {UserEntity} from "../user/UserEntity";
import {userRepository} from "../user/UserRepository";
import {AdminUserDto, adminUserMapper} from "../user/AdminUserMapper";
import {UserSessionEntity} from "../user/UserSessionEntity";
import {AdminUserSessionDto, adminUserSessionMapper} from "../user/AdminUserSessionMapper";
import {userSessionRepository} from "../user/UserSessionRepository";
import {AdminUserEventDto, adminUserEventMapper} from "../user/event/AdminUserEventMapper";
import {UserEventEntity, userEventRepository} from "../user/event/UserEventEntity";
import {
  AdminSessionAggregateStatsDto,
  adminSessionAggregateStatsMapper,
} from "../user/tracking-stats/AdminSessionAggregateStatsMapper";
import {
  SessionAggregateStatsEntity,
  sessionAggregateStatsRepository,
} from "../user/tracking-stats/SessionAggregateStatsEntity";
import {CardCollectionEntity} from "../card-collection/CardCollectionEntity";
import {AdminCollectionDto, adminCollectionMapper} from "../card-collection/AdminCollectionMapper";
import {cardCollectionRepository} from "../card-collection/CardCollectionRepository";

let endpoints:Array<Endpoint> = [];

endpoints = endpoints.concat(
  new MongoDomainEndpointBuilder<ItemEntity, AdminItemDto>()
    .dataName('item')
    .repository(itemRepository)
    .queryMetadata({
      queryFields: [
        { name: '_id', type: "text" },
        { name: 'legacyId', type: "text" },
        { name: 'slug', type: "text" },
        { name: 'itemDetails.setId', type: "text" },
        { name: 'itemDetails.series', type: "text" },
        { name: 'itemDetails.set', type: "text" },
        { name: 'itemDetails.cardNumber', type: "text" },
        { name: 'name', type: "text" },
        { name: 'itemDetails.variant', type: "text", allowedValues: Object.keys(CardVariant) },
      ],
      sortFields: [
        'id',
        'dateCreated',
      ],
      allowedCompoundFields: [

      ],
    })
    .isUpdatable()
    .entityUpdater((id, update) => itemUpdater.updateAndReturn(new ObjectId(id), update))
    .entityMapper(adminItemMapper.map)
    .extraEndpoints([
      AdminRecalculateStatsForCard,
      AdminUpdateKeywordsForCard,
      AdminGetCardSearchParamCsv,
      AdminUpdateImageForCard,
      AdminUpdateVisibilityForCard,
      AdminCreateCard,
      SubmitEbayListHtml,
      BackfillEbayListings,
      BackfillCard,
      SourceOpenListings,
      DownloadCardTestData,
      AdminBulkCsvCreateItem,
      AdminGetSealedItemsCsv,
    ])
    .build()
)

endpoints = endpoints.concat(
  new DomainEndpointBuilder<SetEntity, SetDto>()
    .dataName('set')
    .repository(setRepository)
    .queryMetadata({
      queryFields: [
        { name: 'id', type: "text" },
        { name: 'series', type: "text" },
        { name: 'name', type: "text" },
        { name: 'visible', type: "text", allowedValues: ['true', 'false'] },
      ],
      sortFields: [
        'id',
        'pokePrice.price.amountInMinorUnits',
        'releaseDate',
      ],
      allowedCompoundFields: [
        { fieldNames: ['series', 'name'] },
      ],
    })
    .entityMapper(setDtoMapper.map)
    .extraEndpoints([
      AdminCreateSet,
    ])
    .build()
)

endpoints = endpoints.concat(
  new DomainEndpointBuilder<HistoricalCardPriceEntity, HistoricalCardPriceDto>()
    .dataName('historical-card-price')
    .repository(historicalCardPriceRepository)
    .queryMetadata({
      queryFields: [
        { name: 'id', type: 'text' },
        { name: 'cardId', type: 'text' },
        { name: 'searchIds', type: 'array-text' },
        { name: 'selectionIds', type: 'array-text' },
        { name: 'dateCreated', type: 'datetime' },
        { name: 'sourceType', type: 'text', allowedValues: Object.values(CardDataSource) },
        { name: 'priceDataType', type: 'text', allowedValues: Object.values(PriceDataType) },
      ],
      sortFields: [
        'id',
        'currencyAmount.amountInMinorUnits',
      ],
      allowedCompoundFields: [
        { fieldNames: ['cardId', 'priceDataType', 'timestamp'] },
        { fieldNames: ['searchIds', 'cardId', 'priceDataType', 'timestamp'] },
      ],
    })
    .fieldTransforms({
      'dateCreated': value => momentToTimestamp(moment(value)),
    })
    .entityMapper(historicalCardPriceDtoMapper.mapDto)
    .extraEndpoints([
      AdminActivatePrice,
      AdminDeactivatePrice,
    ])
    .build()
)

endpoints = endpoints.concat(
  new DomainEndpointBuilder<CacheEntryEntity, CacheEntryDto>()
    .dataName('cache-entry')
    .repository(cacheRepository)
    .queryMetadata({
      queryFields: [
        { name: 'id', type: 'text' },
        { name: 'dateCreated', type: 'datetime' },
        { name: 'key', type: 'text' },
        { name: 'value', type: 'text' },
        { name: 'entryType', type: 'text' },
      ],
      sortFields: [
        'id',
      ],
      allowedCompoundFields: [],
    })
    .fieldTransforms({
      'dateCreated': value => momentToTimestamp(moment(value)),
    })
    .entityMapper(cacheEntryDtoMapper.map)
    .build()
)

endpoints = endpoints.concat(
  new DomainEndpointBuilder<CardPriceDataImportAttemptEntity, CardPriceDataImportAttemptDto>()
    .dataName('card-price-data-import-attempt')
    .repository(cardPriceDataImportAttemptRepository)
    .queryMetadata({
      queryFields: [
        { name: 'id', type: 'text' },
        { name: 'dateCreated', type: 'datetime' },
        { name: 'dateStateStarted', type: 'datetime' },
        { name: 'importType', type: 'text', allowedValues: Object.values(ImportType) },
        { name: 'importData.cardId', type: 'text' },
        { name: 'importData.setId', type: 'text' },
        { name: 'state', type: 'text', allowedValues: Object.values(LoadingState) },
      ],
      sortFields: [
        'id',
      ],
      allowedCompoundFields: [
        { fieldNames: ['importData.setId', 'state', 'dateStateStarted', 'importType'] },
        { fieldNames: ['importData.cardId', 'state', 'dateStateStarted', 'importType'] },
      ],
    })
    .fieldTransforms({
      'dateCreated': value => momentToTimestamp(moment(value)),
      'dateStateStarted': value => momentToTimestamp(moment(value)),
    })
    .entityMapper(cardPriceDataImportAttemptDtoMapper.map)
    .build()
)

endpoints = endpoints.concat(
  new DomainEndpointBuilder<CardPriceStatsEntity, CardPriceStatsDto>()
    .dataName('card-price-stats')
    .repository(cardPriceStatsRepository)
    .queryMetadata({
      queryFields: [
        { name: 'id', type: 'text' },
        { name: 'dateCreated', type: 'datetime' },
        { name: 'lastCalculationTime', type: 'datetime' },
        { name: 'mostRecentPrice', type: 'datetime' },
        { name: 'cardId', type: 'text' },
        { name: 'searchId', type: 'text' },
      ],
      sortFields: [
        'id',
      ],
      allowedCompoundFields: [],
    })
    .fieldTransforms({
      'dateCreated': value => momentToTimestamp(moment(value)),
      'lastCalculationTime': value => momentToTimestamp(moment(value)),
      'mostRecentPrice': value => momentToTimestamp(moment(value)),
    })
    .entityMapper(cardPriceStatsDtoMapper.map)
    .build()
)

endpoints = endpoints.concat(
  new DomainEndpointBuilder<MigrationEntity, MigrationDto>()
    .dataName('migration')
    .repository(migrationRepository)
    .queryMetadata({
      queryFields: [
        { name: 'id', type: 'text' },
        { name: 'dateCreated', type: 'datetime' },
        { name: 'dateStateStarted', type: 'datetime' },
      ],
      sortFields: [
        'id',
      ],
      allowedCompoundFields: [],
    })
    .fieldTransforms({
      'dateCreated': value => momentToTimestamp(moment(value)),
      'dateStateStarted': value => momentToTimestamp(moment(value)),
    })
    .entityMapper(migrationDtoMapper.map)
    .build()
)

endpoints = endpoints.concat(
  new DomainEndpointBuilder<EbayCardSearchParamEntity, EbayCardSearchParamDto>()
    .dataName('ebay-search-param')
    .repository(ebayCardSearchParamRepository)
    .queryMetadata({
      queryFields: [
        { name: 'id', type: 'text' },
        { name: 'dateCreated', type: 'datetime' },
        { name: 'cardId', type: 'text' },
        { name: 'set', type: 'text' },
        { name: 'numberInSet', type: 'text' },
        { name: 'active', type: 'text' },
      ],
      sortFields: [
        'id',
      ],
      allowedCompoundFields: [
        { fieldNames: ['active', 'dateCreated', 'id'] },
        { fieldNames: ['cardId', 'dateCreated'] },
      ],
    })
    .fieldTransforms({
      'dateCreated': value => momentToTimestamp(moment(value)),
    })
    .entityMapper(ebaySearchParamDtoMapper.map)
    .entityCreator(ebayCardSearchParamCreator.createFromDetails)
    .extraEndpoints([
      AdminReconcileListingsForSearch,
    ])
    .build()
)

endpoints = endpoints.concat(
  new DomainEndpointBuilder<NewsEntity, NewsDto>()
    .dataName('news')
    .repository(newsRepository)
    .queryMetadata({
      queryFields: [
        { name: 'id', type: 'text' },
        { name: 'dateCreated', type: 'datetime' },
        { name: 'date', type: 'datetime' },
        { name: 'active', type: 'text', allowedValues: ['true', 'false'] },
      ],
      sortFields: [
        'id',
      ],
      allowedCompoundFields: [
        { fieldNames: ['active', 'date'] },
      ],
    })
    .fieldTransforms({
      'dateCreated': value => momentToTimestamp(moment(value)),
    })
    .entityMapper(newsDtoMapper.map)
    .entityCreator(newsCreator.createFromDetails)
    .entityUpdater(newsUpdater.update)
    .isUpdatable()
    .build()
)


endpoints = endpoints.concat(
  new DomainEndpointBuilder<SetPriceStatsEntity, SetPriceStatsDto>()
    .dataName('set-price-stats')
    .repository(setPriceStatsRepository)
    .queryMetadata({
      queryFields: [
        { name: 'id', type: 'text' },
        { name: 'dateCreated', type: 'datetime' },
        { name: 'setId', type: 'text' },
        { name: 'set', type: 'text' },
        { name: 'mostRecentPrice', type: 'datetime' },
        { name: 'lastCalculationTime', type: 'datetime' },
      ],
      sortFields: [
        'id',
      ],
      allowedCompoundFields: [],
    })
    .fieldTransforms({
      'dateCreated': value => momentToTimestamp(moment(value)),
      'mostRecentPrice': value => momentToTimestamp(moment(value)),
      'lastCalculationTime': value => momentToTimestamp(moment(value)),
    })
    .entityMapper(setPriceStatsDtoMapper.map)
    .build()
)

endpoints = endpoints.concat(
  new DomainEndpointBuilder<EbayOpenListingEntity, EbayOpenListingDto>()
    .dataName('ebay-open-listing')
    .repository(ebayOpenListingRepository)
    .queryMetadata({
      queryFields: [
        { name: 'id', type: 'text' },
        { name: 'dateCreated', type: 'datetime' },
        { name: 'cardId', type: 'text' },
        { name: 'historicalCardPriceId', type: 'text' },
        { name: 'state', type: 'text' },
        { name: 'searchIds', type: 'array-text' },
        { name: 'selectionIds', type: 'array-text' },
      ],
      sortFields: [
        'id',
      ],
      allowedCompoundFields: [
        { fieldNames: ['cardId', 'state'] },
        { fieldNames: ['searchIds', 'state'] },
      ],
    })
    .fieldTransforms({
      'dateCreated': value => momentToTimestamp(moment(value)),
    })
    .entityMapper(ebayOpenListingDtoMapper.map)
    .extraEndpoints([
      AdminGetTopBuyingOpportunitiesCsv,
      AdminGetListingsEndingSoonCsv,
      AdminArchiveOpenListing,
    ])
    .build()
)

endpoints = endpoints.concat(
  new DomainEndpointBuilder<CardPriceSelectionEntity, CardPriceSelectionDto>()
    .dataName('card-price-selection')
    .repository(cardPriceSelectionRepository)
    .queryMetadata({
      queryFields: [
        { name: 'id', type: 'text' },
        { name: 'cardId', type: 'text' },
        { name: 'priceType', type: 'text' },
        { name: 'currencyCode', type: 'text' },
        { name: 'condition', type: 'text' },
        { name: 'searchId', type: 'text' },
      ],
      sortFields: [],
      allowedCompoundFields: [
        { fieldNames: ['cardId', 'priceType', 'currencyCode', 'condition'] },
      ],
    })
    .entityMapper(cardSelectionMapper.map)
    .build()
)

endpoints = endpoints.concat(
  new DomainEndpointBuilder<CardStatsEntityV2, CardStatsDtoV2>()
    .dataName('card-stats-v2')
    .repository(cardStatsRepository)
    .queryMetadata({
      queryFields: [
        { name: 'id', type: 'text' },
        { name: 'cardId', type: 'text' },
        { name: 'priceType', type: 'text' },
        { name: 'currencyCode', type: 'text' },
        { name: 'condition', type: 'text' },
        { name: 'selectionId', type: 'text' },
      ],
      sortFields: [],
      allowedCompoundFields: [
        { fieldNames: ['cardId', 'priceType', 'currencyCode', 'condition'] },
      ],
    })
    .entityMapper(cardStatsMapper.map)
    .build()
)

endpoints = endpoints.concat(
  new DomainEndpointBuilder<CardListAliasEntity, CardListAliasDto>()
    .dataName('card-list-alias')
    .repository(cardListAliasRepository)
    .queryMetadata({
      queryFields: [
        { name: 'id', type: "text" },
        { name: 'canonicalSlug', type: "text" },
        { name: 'aliasSlug', type: "text" },
      ],
      sortFields: [
        'id',
      ],
      allowedCompoundFields: [
      ],
    })
    .isUpdatable()
    .entityUpdater(updateFunctionBuilder.buildEntityUpdater(cardListAliasUpdater.updateAndReturn, updateCardListAliasSchema))
    .entityCreator(createFunctionBuilder.buildEntityCreator(cardListAliasCreator.create, createCardListAliasSchema))
    .entityMapper(cardListAliasMapper.map)
    .extraEndpoints([
      // AdminCreateCardListAlias,
    ])
    .build()
)

endpoints = endpoints.concat(
  new DomainEndpointBuilder<UserEntity, AdminUserDto>()
    .dataName('user')
    .repository(userRepository)
    .queryMetadata({
      queryFields: [
        { name: 'id', type: "text" },
        { name: 'details.email', type: "text" },
        { name: 'parentUserId', type: "text" },
      ],
      sortFields: [
        'id',
      ],
      allowedCompoundFields: [
      ],
    })
    .entityMapper(adminUserMapper.map)
    .extraEndpoints([

    ])
    .build()
)

endpoints = endpoints.concat(
  new DomainEndpointBuilder<UserSessionEntity, AdminUserSessionDto>()
    .dataName('user-session')
    .repository(userSessionRepository)
    .queryMetadata({
      queryFields: [
        { name: 'id', type: "text" },
        { name: 'userId', type: "text" },
      ],
      sortFields: [
        'dateCreated',
      ],
      allowedCompoundFields: [
      ],
    })
    .entityMapper(adminUserSessionMapper.map)
    .extraEndpoints([

    ])
    .build()
)

endpoints = endpoints.concat(
  new MongoDomainEndpointBuilder<UserEventEntity, AdminUserEventDto>()
    .dataName('user-event')
    .repository(userEventRepository)
    .queryMetadata({
      queryFields: [
        { name: 'id', type: "text" },
        { name: 'userId', type: "text" },
        { name: 'sessionId', type: "text" },
        { name: 'eventName', type: "text" },
      ],
      sortFields: [
        'timestamp',
      ],
      allowedCompoundFields: [
        { fieldNames: ['userId', 'eventName'] },
        { fieldNames: ['sessionId', 'eventName'] },
      ],
    })
    .entityMapper(adminUserEventMapper.map)
    .extraEndpoints([

    ])
    .build()
)

endpoints = endpoints.concat(
  new MongoDomainEndpointBuilder<SessionAggregateStatsEntity, AdminSessionAggregateStatsDto>()
    .dataName('session-aggregate-stats')
    .repository(sessionAggregateStatsRepository)
    .queryMetadata({
      queryFields: [
        { name: 'id', type: "text" },
        { name: 'groupingKey', type: "text" },
      ],
      sortFields: [
        'lastCalculated',
      ],
      allowedCompoundFields: [

      ],
    })
    .entityMapper(adminSessionAggregateStatsMapper.map)
    .extraEndpoints([

    ])
    .build()
)

endpoints = endpoints.concat(
  new DomainEndpointBuilder<CardCollectionEntity, AdminCollectionDto>()
    .dataName('collection')
    .repository(cardCollectionRepository)
    .queryMetadata({
      queryFields: [
        { name: 'id', type: "text" },
        { name: 'name', type: "text" },
        { name: 'parentCollectionId', type: "text" },
        { name: 'cardIds', type: "array-text" },
      ],
      sortFields: [
        'dateCreated',
      ],
      allowedCompoundFields: [
      ],
    })
    .entityMapper(adminCollectionMapper.map)
    .extraEndpoints([

    ])
    .build()
)

export const AdminEndpoints = endpoints;

