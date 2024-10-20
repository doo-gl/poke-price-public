import {baseExternalClient} from "../../../client/BaseExternalClient";
import moment, {Moment} from "moment";
import {logger} from "firebase-functions";

const API_ROOT = 'https://mpapi.tcgplayer.com'
const MPFEV = '1522' // update this as much as possible
const CORS_HEADERS = {
  'accept': 'application/json, text/plain, */*',
  'accept-encoding': 'gzip, deflate, br',
  'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
  'origin': 'https://www.tcgplayer.com',
  'referer': 'https://www.tcgplayer.com/',
  'sec-ch-ua': '"Chromium";v="110", "Not A(Brand";v="24", "Google Chrome";v="110"',
  'sec-ch-ua-mobile': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'cross-site',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
}

export interface TcgResultResponse<T> {
  errors: Array<any>,
  results: Array<T>
}

export interface TcgPlayerLatestSaleDto {
  condition:string,
  variant:string,
  language:string,
  quantity:number,
  title:string,
  listingType:string,
  customListingId:string,
  purchasePrice:number,
  shippingPrice:number,
  orderDate:string,
}

export interface TcgPlayerLatestSalesResponse {
  data:Array<TcgPlayerLatestSaleDto>,
  nextPage:string,
  previousPage:string,
  resultCount:number,
  totalResults:number,
}

export interface TcgPlayerGetSalesOptions {
  limit?:number,
  mostRecentSale?:Moment,
}

const getLatestSales = async (productId:string, options?:TcgPlayerGetSalesOptions):Promise<Array<TcgPlayerLatestSaleDto>> => {
  const url = `${API_ROOT}/v2/product/${productId}/latestsales?mpfev=${MPFEV}`
  const maxResultsPerCall = 25

  const allSales = new Array<TcgPlayerLatestSaleDto>()

  const getSalesForOffset = async (from:number) => {
    const body = {
      time: new Date().getTime(),
      offset: from,
      limit: maxResultsPerCall,
      listingType: "All",
    }
    const response = await baseExternalClient.post<TcgPlayerLatestSalesResponse>(
      url,
      {
        ...CORS_HEADERS,
      },
      body
    )
    return response
  }

  let shouldContinue = true
  let offset = 0
  while (shouldContinue) {
    const latestSalesResponse = await getSalesForOffset(offset)
    const latestSales = latestSalesResponse.data
    let hasReachedMostRecentSale = false
    latestSales.forEach(sale => {
      allSales.push(sale)
      const orderDate = moment(sale.orderDate)
      hasReachedMostRecentSale = !!options && !!options.mostRecentSale && options.mostRecentSale.isAfter(orderDate)
    })

    const hasHitLimit = options && options.limit && options.limit <= allSales.length
    shouldContinue = latestSalesResponse.nextPage === "Yes" && !hasReachedMostRecentSale && !hasHitLimit
    if (shouldContinue) {
      offset += maxResultsPerCall
    }
  }

  return allSales
}


export interface TcgPlayerListingDto {
  directProduct:boolean,
  goldSeller:boolean,
  listingId:number,
  channelId:string,
  conditionId:string,
  listedDate:string,
  verifiedSeller:boolean,
  directInventory:number,
  rankedShippingPrice:number,
  productId:number,
  printing:string,
  languageAbbreviation:string,
  sellerName:string,
  forwardFreight:boolean,
  sellerShippingPrice:number,
  language:string,
  shippingPrice:number,
  condition:string,
  languageId:number,
  score:number,
  directSeller:boolean,
  productConditionId:number,
  sellerId:string,
  listingType:string,
  sellerRating:number,
  sellerSales:string,
  quantity:number,
  sellerKey:string,
  price:number,
  customData: {
    images?:Array<string>,
    title?:string,
    description?:string,
    linkId?:string,
  }
}

export interface TcgPlayerListingResponse {
  totalResults:number,
  aggregations: {
    conditions: Array<{
      value:string,
      count:number
    }>,
    quantity: Array<{
      value:number,
      count:number,
    }>,
    listingType:Array<{
      value:string,
      count:number
    }>,
    language:Array<{
      value:string,
      count:number
    }>,
    printing:Array<{
      value:string,
      count:number
    }>,
  }
  resultId:string,
  results:Array<TcgPlayerListingDto>
}

const getListings = async (productId:string):Promise<Array<TcgPlayerListingDto>> => {
  const url = `${API_ROOT}/v2/product/${productId}/listings?mpfev=${MPFEV}`
  const maxResultsPerCall = 100

  const getListingsFrom = async (from:number) => {
    const body = {
      aggregations: ["listingType"],
      context: {shippingCountry: "US", card: {}},
      filters: {
        exclude: {channelExclusion: 0},
        range: {quantity: {gte: 1}},
        term: {sellerStatus: "Live", channelId: 0},
      },
      from,
      size: maxResultsPerCall,
      sort: {field: "price+shipping", order: "asc"},
    }
    const response = await baseExternalClient.post<TcgResultResponse<TcgPlayerListingResponse>>(
      url,
      {
        ...CORS_HEADERS,
      },
      body
    )
    return response
  }


  const allListings = new Array<TcgPlayerListingDto>()
  let shouldContinue = true
  let offset = 0
  while (shouldContinue) {
    const listingResponse = await getListingsFrom(offset)
    if (listingResponse.results.length <= 0) {
      shouldContinue = false
      continue
    }
    const listings = listingResponse.results[0].results

    listings.forEach(listing => {
      allListings.push(listing)
    })

    const hasHitLimit = listings.length <= 0 || allListings.length >= listingResponse.results[0].totalResults
    shouldContinue = !hasHitLimit
    if (shouldContinue) {
      offset += maxResultsPerCall
    }
  }

  return allListings
}


export interface TcgPlayerProductDto {
  shippingCategoryId:number,
  duplicate:boolean,
  productLineUrlName:string,
  productUrlName:string,
  productTypeId:number,
  rarityName:string,
  sealed:boolean,
  marketPrice:number,
  customAttributes:any,
  lowestPriceWithShipping:number,
  productName:string,
  setId:number,
  productId:number,
  score:number,
  setName:string,
  foilOnly:boolean,
  setUrlName:string,
  sellerListable:boolean,
  totalListings:number,
  productLineId:number,
  productStatusId:number,
  productLineName:string,
  maxFulfillableQuantity:number,
  listings:Array<TcgPlayerListingDto>,
  lowestPrice:number,
}

export interface TcgPlayerCardProductAttributes {
  description:string,
  attack1:string|null,
  attack2:string|null,
  attack3:string|null,
  attack4:string|null,
  stage:string|null
  detailNote:string|null,
  energyType:Array<string>,
  releaseDate:string,
  number:string,
  cardType:Array<string>,
  cardTypeB:string|null,
  retreatCost:string|null,
  resistance:string,
  rarityDbName:string|null,
  weakness:string|null,
  flavourText:string|null,
  hp:string|null,
}

export interface TcgPlayerGenericProductAttributes {
  description:string|null,
  detailNote:string|null,
  energyType:string|null,
  flavorText:string|null,
  number:string|null,
  rarityDbName:string|null,
  releaseDate:string|null,
}

export interface TcgPlayerProductResponse {
  aggregations:{}, // TODO if they become relevant
  totalResults:number,
  resultId:string,
  algorithm:string,
  searchType:string,
  results:Array<TcgPlayerProductDto>
}

export interface TcgPlayerGetProductsRequest {
  setName:string,
  sealed:boolean,
}

const getProducts = async (request:TcgPlayerGetProductsRequest) => {
  const url = `${API_ROOT}/v2/search/request?q=&isList=false&mpfev=${MPFEV}`
  const maxResultsPerCall = 100
  logger.info(`Reading Tcg Player Products for: ${JSON.stringify(request)}`)

  const getProductsFrom = async (from:number) => {
    logger.info(`Reading Tcg Player Products for: ${JSON.stringify(request)}, from: ${from}`)
    const body = {
      "algorithm":"salespna",
      "from":from,
      "size":maxResultsPerCall,
      "filters":{
        "term":{
          "productLineName":["pokemon"],
          "productTypeName":[request.sealed ? "Sealed Products" : "Cards"],
          "setName":[request.setName]},
        "range":{},
        "match":{},
      },
      "listingSearch":{
        "filters":{
          "term":{"sellerStatus":"Live","channelId":0},
          "range":{"quantity":{"gte":1}},
          "exclude":{"channelExclusion":0},
        },
        "context":{"cart":{}},
      },
      "context":{"cart":{},"shippingCountry":"US"},
      "settings":{"useFuzzySearch":false},"sort":{},
    }

    const response = await baseExternalClient.post<TcgResultResponse<TcgPlayerProductResponse>>(
      url,
      {
        ...CORS_HEADERS,
      },
      body
    )
    return response
  }

  const allProducts = new Array<TcgPlayerProductDto>()
  let shouldContinue = true
  let offset = 0
  while (shouldContinue) {
    const productResponse = await getProductsFrom(offset)
    logger.info(`Tcg Player response has ${productResponse.results.length} high level results`)
    if (productResponse.results.length <= 0) {
      shouldContinue = false
      continue
    }
    const products = productResponse.results[0].results
    logger.info(`Tcg Player response has ${products.length} product results`)
    products.forEach(product => {
      allProducts.push(product)
    })

    const hasHitLimit = products.length <= 0 || allProducts.length >= productResponse.results[0].totalResults || allProducts.length >= 1000
    shouldContinue = !hasHitLimit
    if (shouldContinue) {
      offset += maxResultsPerCall
    }
  }

  return allProducts

}

export interface TcgPlayerSetDto {
  abbreviation:string,
  active:true,
  categoryId:number,
  cleanSetName:string,
  name:string,
  releaseDate:string,
  setNameId:number,
}

const getSets = async ():Promise<Array<TcgPlayerSetDto>> => {
  const url = `${API_ROOT}/v2/Catalog/SetNames?active=true&categoryId=3&mpfev=${MPFEV}`

  const response = await baseExternalClient.get<TcgResultResponse<TcgPlayerSetDto>>(
    url,
    {
      ...CORS_HEADERS,
    },
    null
  )

  return response.results
}

export const tcgPlayerApiClient = {
  getLatestSales,
  getListings,
  getProducts,
  getSets,
}