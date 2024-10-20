import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {ADMIN_AUTH} from "../../infrastructure/Authorization";
import {cardPokePriceUpdater} from "../stats/card-v2/CardPokePriceUpdater";
import {cardSearchKeywordUpdater} from "../card/CardSearchKeywordUpdater";
import {JSONSchemaType} from "ajv";
import {CardVariant, SearchKeywords, searchKeywordsSchema} from "../card/CardEntity";
import {jsonValidator} from "../../tools/JsonValidator";
import {ebaySearchParamRetriever} from "../ebay/search-param/EbayCardSearchParamRetriever";
import {ebaySearchParamPriceReconciler} from "../ebay/search-param/EbaySearchParamPriceReconciler";
import {cardPriceSelectionRetriever} from "../stats/card-v2/CardPriceSelectionRetriever";
import {cardSelectionReconciler} from "../stats/card-v2/CardSelectionReconciler";
import {cardStatsRetrieverV2} from "../stats/card-v2/CardStatsRetriever";
import {cardStatsCalculator} from "../stats/card-v2/CardStatsCalculator";
import {cardImageUploader} from "../card/CardImageUploader";
import {cardVisibilityUpdater} from "../card/CardVisibilityUpdater";
import {adminCardCreator, CardCreateRequest} from "../card/AdminCardCreator";
import {ebayListUrlReader} from "../ebay/open-listing/EbayListUrlReader";
import {openListingResultParser} from "../ebay/open-listing/OpenListingResultParser";
import {ebayListingBackfiller} from "../ebay/open-listing/EbayListingBackfiller";
import {ebayOpenListingSourcer} from "../ebay/open-listing/EbayOpenListingSourcer";
import {testDataExporter} from "../../debug/TestDataExporter";
import {ObjectId} from "mongodb";
import {isProduction} from "../../infrastructure/ProductionDecider";


export const AdminRecalculateStatsForCard:Endpoint = {
  path: '/card/:id/action/recalculate-stats',
  method: Method.PUT,
  auth: ADMIN_AUTH,
  requestHandler: async (req, res, next) => {
    const cardId = req.params.id
    await cardSelectionReconciler.reconcileForCard(cardId)
    await cardStatsCalculator.calculateForCard(cardId)
    await cardPokePriceUpdater.update(cardId)
    return {}
  },
}


export const AdminUpdateKeywordsForCard:Endpoint = {
  path: '/card/:id/action/update-keywords',
  method: Method.PUT,
  auth: ADMIN_AUTH,
  requestHandler: async (req, res, next) => {
    const cardId = req.params.id
    const keywords = jsonValidator.validate<SearchKeywords>(req.body, searchKeywordsSchema)
    await cardSearchKeywordUpdater.update(cardId, keywords)
    const searchParams = await ebaySearchParamRetriever.retrieveSearchParamsForCardId(cardId);
    await Promise.all(
      searchParams.map(searchParam => ebaySearchParamPriceReconciler.reconcile(searchParam.id))
    )
    const selections = await cardPriceSelectionRetriever.retrieveForCardId(cardId)
    await Promise.all(
      selections.map(selection => cardSelectionReconciler.reconcileForSelection(selection))
    )
    const stats = await cardStatsRetrieverV2.retrieveForCardId(cardId);
    await Promise.all(
      stats.map(stat => cardStatsCalculator.calculateForStats(stat))
    )
    await cardPokePriceUpdater.update(cardId);
    return {}
  },
}

export const updateCardImageRequestSchema:JSONSchemaType<UpdateCardImageRequest> = {
  type: "object",
  properties: {
    imageUrl: { type: "string"},
  },
  additionalProperties: false,
  required: ["imageUrl"],
}
export interface UpdateCardImageRequest {
  imageUrl:string
}
export const AdminUpdateImageForCard:Endpoint = {
  path: '/card/:id/action/update-image',
  method: Method.PUT,
  auth: ADMIN_AUTH,
  requestHandler: async (req, res, next) => {
    const cardId = req.params.id
    const request = jsonValidator.validate<UpdateCardImageRequest>(req.body, updateCardImageRequestSchema)
    await cardImageUploader.upload(new ObjectId(cardId), [request.imageUrl])
    return {}
  },
}

export const updateCardVisibilityRequestSchema:JSONSchemaType<UpdateCardVisibilityRequest> = {
  type: "object",
  properties: {
    visible: { type: "boolean"},
  },
  additionalProperties: false,
  required: ["visible"],
}
export interface UpdateCardVisibilityRequest {
  visible:boolean
}
export const AdminUpdateVisibilityForCard:Endpoint = {
  path: '/card/:id/action/update-visibility',
  method: Method.PUT,
  auth: ADMIN_AUTH,
  requestHandler: async (req, res, next) => {
    const cardId = req.params.id
    const request = jsonValidator.validate<UpdateCardVisibilityRequest>(req.body, updateCardVisibilityRequestSchema)
    await cardVisibilityUpdater.update(cardId, request.visible)
    return {}
  },
}

export const cardCreateRequestSchema:JSONSchemaType<CardCreateRequest> = {
  type: "object",
  properties: {
    setId: { type: "string" },
    cardNumber: { type: "string" },
    variant: { type: "string", anyOf: Object.keys(CardVariant).map(variant => ({ const: variant })) },
    cardName: { type: "string" },
    imageUrl: { type: "string" },
    rarity: { type: "string", nullable: true },
    flavourText: { type: "string", nullable: true },
    artist: { type: "string", nullable: true },
    superType: { type: "string" },
    types: { type: "array", items: { type: "string" } },
    subTypes: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
  required: [
    "setId",
    "cardNumber",
    "variant",
    "cardName",
    "imageUrl",
    "rarity",
    "flavourText",
    "artist",
    "superType",
    "types",
    "subTypes",
  ],
}
export const AdminCreateCard:Endpoint = {
  path: '/card',
  method: Method.POST,
  auth: ADMIN_AUTH,
  requestHandler: async (req, res, next) => {
    const request = jsonValidator.validate<CardCreateRequest>(req.body, cardCreateRequestSchema)
    return adminCardCreator.create(request)
  },
}

interface EbayHtmlSubmission {
  html:string
}
export const ebayHtmlSubmissionSchema:JSONSchemaType<EbayHtmlSubmission> = {
  type: "object",
  properties: {
    html: { type: "string" },
  },
  additionalProperties: false,
  required: ["html"],
}
export const SubmitEbayListHtml:Endpoint = {
  path: '/card/:id/action/submit-ebay-list-html',
  method: Method.PUT,
  auth: ADMIN_AUTH,
  requestHandler: async (req, res, next) => {
    const cardId = req.params.id
    const request = jsonValidator.validate(req.body, ebayHtmlSubmissionSchema)
    const results = await ebayListUrlReader.readListHtmlPage(request.html)
    await openListingResultParser.parse(cardId, results)
    return {}
  },
}

export const BackfillEbayListings:Endpoint = {
  path: '/card/:id/action/backfill-ebay',
  method: Method.PUT,
  auth: ADMIN_AUTH,
  requestHandler: async (req, res, next) => {
    const cardId = req.params.id

    await ebayListingBackfiller.backfill(cardId, {force: true, local: !isProduction()})
    return {}
  },
}

export const BackfillCard:Endpoint = {
  path: '/card/:id/action/backfill',
  method: Method.PUT,
  auth: ADMIN_AUTH,
  requestHandler: async (req, res, next) => {
    const cardId = req.params.id

    await Promise.all([
      ebayListingBackfiller.backfill(cardId),
      ebayOpenListingSourcer.source(cardId),
    ])

    await cardSelectionReconciler.reconcileForCard(cardId)
    await cardStatsCalculator.calculateForCard(cardId)
    await cardPokePriceUpdater.update(cardId)

    return {}
  },
}

export const SourceOpenListings:Endpoint = {
  path: '/card/:id/action/source-open-listings',
  method: Method.PUT,
  auth: ADMIN_AUTH,
  requestHandler: async (req, res, next) => {
    const cardId = req.params.id
    await ebayOpenListingSourcer.source(cardId)
    return {}
  },
}

export const DownloadCardTestData:Endpoint = {
  path: '/card/:id/action/test-data',
  method: Method.GET,
  auth: ADMIN_AUTH,
  requestHandler: async (req, res, next) => {
    const cardId = req.params.id
    return testDataExporter.exportDataForCard(cardId)
  }
  ,
}

