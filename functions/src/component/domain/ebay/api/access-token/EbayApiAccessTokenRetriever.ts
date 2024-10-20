

import {baseExternalClient} from "../../../../client/BaseExternalClient";
import {
  ebayApiAccessTokenCreator,
  EbayApiAccessTokenEntity,
  ebayApiAccessTokenRepository,
} from "./EbayApiAccessTokenEntity";
import {momentToTimestamp, timestampToMoment} from "../../../../tools/TimeConverter";
import moment from "moment";
import {SortOrder} from "../../../../database/BaseCrudRepository";
import {Create} from "../../../../database/Entity";
import {configRetriever} from "../../../../infrastructure/ConfigRetriever";

interface AccessTokenResponse {
  access_token:string,
  expires_in:number, // number of seconds
  token_type:string,
}

const buildAuthHeader = ():string => {
  const clientId = configRetriever.retrieve().ebayApiClientId()
  const clientSecret = configRetriever.retrieve().ebayApiClientSecret()
  const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  return `Basic ${encoded}`
}

const isExpired = (tokenEntity:EbayApiAccessTokenEntity):boolean => {
  return timestampToMoment(tokenEntity.expiresAt).isBefore(moment())
}

let localCache:EbayApiAccessTokenEntity|null = null
const fetchFromLocalCache = ():string|null => {
  if (!localCache || isExpired(localCache)) {
    return null
  }
  return localCache.token
}

const retrieveLatestToken = async ():Promise<EbayApiAccessTokenEntity|null> => {
  const latestTokens = await ebayApiAccessTokenRepository.getMany(
    [],
    {limit: 1, sort: [{field: "expiresAt", order: SortOrder.DESC}]}
  )
  if (latestTokens.length === 0) {
    return null
  }
  return latestTokens[0]
}
const fetchFromDatabase = async ():Promise<string|null> => {
  const latestToken = await retrieveLatestToken()
  if (!latestToken || isExpired(latestToken)) {
    return null
  }
  localCache = latestToken
  return latestToken.token
}

const saveNewToken = async (response:AccessTokenResponse):Promise<EbayApiAccessTokenEntity> => {
  const expiresAt = momentToTimestamp(
    moment().add(response.expires_in - 2, 'second')
  )
  const create:Create<EbayApiAccessTokenEntity> = {
    token: response.access_token,
    tokenType: response.token_type,
    expiresIn: response.expires_in,
    expiresAt,
  }
  const newEntity = await ebayApiAccessTokenCreator.create(create)
  localCache = newEntity
  return newEntity
}
const fetchFromApi = async ():Promise<string> => {
  const authHeader = buildAuthHeader()
  const response = await baseExternalClient.post<AccessTokenResponse>(
    'https://api.ebay.com/identity/v1/oauth2/token',
    {
      'Authorization': authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope'
  )
  await saveNewToken(response)
  return response.access_token
}

const retrieve = async ():Promise<string> => {

  const localToken = fetchFromLocalCache()
  if (localToken) {
    return localToken
  }
  const databaseToken = await fetchFromDatabase()
  if (databaseToken) {
    return databaseToken
  }
  return await fetchFromApi()

}

export const ebayApiAccessTokenRetriever = {
  retrieve,
}