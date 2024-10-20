import {authorizedClient} from "./AuthorizedClient";
import {configRetriever} from "./ConfigRetriever";


const recalculateStatsForCard = (cardId:string):Promise<void> => {
  const config = configRetriever.retrieve();
  const url = `${config.apiRoot}/card/${cardId}/action/recalculate-stats`
  return authorizedClient.put<void>(url, null)
    .then(response => response.data)
}

export interface SearchKeywords {
  includes:Array<string>,
  excludes:Array<string>,
  ignores:Array<string>,
}
const updateKeywordsForCard = (cardId:string, searchKeywords:SearchKeywords):Promise<void> => {
  const config = configRetriever.retrieve();
  const url = `${config.apiRoot}/card/${cardId}/action/update-keywords`
  return authorizedClient.put<void>(url, searchKeywords)
    .then(response => response.data)
}
const updateImageForCard = (cardId:string, imageUrl:string):Promise<void> => {
  const config = configRetriever.retrieve();
  const url = `${config.apiRoot}/card/${cardId}/action/update-image`
  return authorizedClient.put<void>(url, { imageUrl })
    .then(response => response.data)
}
const submitEbayListHtml = (cardId:string, html:string):Promise<void> => {
  const config = configRetriever.retrieve();
  const url = `${config.apiRoot}/card/${cardId}/action/submit-ebay-list-html`
  return authorizedClient.put<void>(url, { html })
    .then(response => response.data)
}
const backfillEbayListings = (cardId:string):Promise<void> => {
  const config = configRetriever.retrieve();
  const url = `${config.apiRoot}/card/${cardId}/action/backfill-ebay`
  return authorizedClient.put<void>(url, null)
    .then(response => response.data)
}
const sourceOpenListings = (cardId:string):Promise<void> => {
  const config = configRetriever.retrieve();
  const url = `${config.apiRoot}/card/${cardId}/action/source-open-listings`
  return authorizedClient.put<void>(url, null)
    .then(response => response.data)
}
const getCardTestData = (cardId:string):Promise<object> => {
  const config = configRetriever.retrieve();
  const url = `${config.apiRoot}/card/${cardId}/action/test-data`
  return authorizedClient.get<object>(url)
    .then(response => response.data)
}
const updateVisibilityForCard = (cardId:string, visible:boolean):Promise<void> => {
  const config = configRetriever.retrieve();
  const url = `${config.apiRoot}/card/${cardId}/action/update-visibility`
  return authorizedClient.put<void>(url, { visible })
    .then(response => response.data)
}

const reconcileListings = (searchId:string):Promise<void> => {
  const config = configRetriever.retrieve();
  const url = `${config.apiRoot}/ebay-search-param/${searchId}/action/reconcile-listings`
  return authorizedClient.put<void>(url, null)
    .then(response => response.data)
}

const activatePrice = (priceId:string):Promise<void> => {
  const config = configRetriever.retrieve();
  const url = `${config.apiRoot}/historical-card-price/${priceId}/action/activate`
  return authorizedClient.put<void>(url, null)
    .then(response => response.data)
}

const deactivatePrice = (priceId:string):Promise<void> => {
  const config = configRetriever.retrieve();
  const url = `${config.apiRoot}/historical-card-price/${priceId}/action/deactivate`
  return authorizedClient.put<void>(url, null)
    .then(response => response.data)
}

const archiveListing = (listingId:string):Promise<void> => {
  const config = configRetriever.retrieve();
  const url = `${config.apiRoot}/open-listing/${listingId}/action/archive`
  return authorizedClient.put<void>(url, null)
    .then(response => response.data)
}

const getCardSearchParamsCsv = () => {
  const config = configRetriever.retrieve();
  const url = `${config.apiRoot}/card/search-param/csv`
  return authorizedClient.get<string>(url)
    .then(response => response.data)
}

const getTopBuyingOpportunityCsv = () => {
  const config = configRetriever.retrieve();
  const url = `${config.apiRoot}/open-listing/top-buying-opportunity/csv`
  return authorizedClient.get<string>(url)
    .then(response => response.data)
}

const getListingsEndingSoonCsv = () => {
  const config = configRetriever.retrieve();
  const url = `${config.apiRoot}/open-listing/ending-soon/csv`
  return authorizedClient.get<string>(url)
    .then(response => response.data)
}

const getSealedItemsCsv = () => {
  const config = configRetriever.retrieve();
  const url = `${config.apiRoot}/item/action/sealed-items-csv`
  return authorizedClient.get<string>(url)
    .then(response => response.data)
}


export interface CreateSetRequest {
  series:string,
  name:string,
  imageUrl:string,
  backgroundImageUrl:string,
  symbolUrl:string,
  releaseDate:string,
  displaySetNumber:string,
}
const createSet = (request:CreateSetRequest):Promise<void> => {
  const config = configRetriever.retrieve();
  const url = `${config.apiRoot}/set`
  return authorizedClient.post<void>(url, request)
    .then(response => response.data)
}

export interface CreateCardRequest {
  setId:string,
  cardName:string,
  cardNumber:string,
  superType:string,
  subTypes:Array<string>,
  types:Array<string>,
  rarity:string|null,
  imageUrl:string,
  artist:string|null,
  flavourText:string|null,
  variant:'DEFAULT'|'REVERSE_HOLO',
}
const createCard = (request:CreateCardRequest):Promise<void> => {
  const config = configRetriever.retrieve();
  const url = `${config.apiRoot}/card`
  return authorizedClient.post<void>(url, request)
    .then(response => response.data)
}

export interface ItemBulkCsvImportRequest {
  itemType:'GENERIC',
  csv:string,
}
const bulkCsvCreateItem = (request:ItemBulkCsvImportRequest):Promise<void> => {
  const config = configRetriever.retrieve();
  const url = `${config.apiRoot}/item/action/bulk-csv-create`
  return authorizedClient.post<void>(url, request)
    .then(response => response.data)
}


export const adminClient = {
  recalculateStatsForCard,
  archiveListing,
  updateKeywordsForCard,
  updateImageForCard,
  updateVisibilityForCard,
  reconcileListings,
  activatePrice,
  deactivatePrice,
  getCardSearchParamsCsv,
  getTopBuyingOpportunityCsv,
  getListingsEndingSoonCsv,
  createCard,
  createSet,
  submitEbayListHtml,
  backfillEbayListings,
  sourceOpenListings,
  getCardTestData,
  bulkCsvCreateItem,
  getSealedItemsCsv,
}