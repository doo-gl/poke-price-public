import {configRetriever} from "../../infrastructure/ConfigRetriever";
import {queryString} from "../../external-lib/QueryString";
import {baseExternalClient, Method} from "../../client/BaseExternalClient";
import {uuid} from "../../external-lib/Uuid";

const FETCH_ENDPOINTS = new Array<string>(
//  Add urls for scraping endpoints here

)



const randomInt = (limitExc:number) => {
  return Math.floor(Math.random() * (limitExc))
}

let index = 0
const endpointIndex = () => {
  if (index >= FETCH_ENDPOINTS.length * 1000) {
    index = 0
  }
  return index++ % FETCH_ENDPOINTS.length
}

const pickEndpoint = ():string => {
  return FETCH_ENDPOINTS[endpointIndex()]
}

export interface WebScraperResponse {
  data:any,
  error:any,
  status:number|null,
}



const fetchUrl = async (url:string, options?:{local?:boolean}):Promise<WebScraperResponse> => {
  const config = configRetriever.retrieve();
  const query = queryString.stringify({ basicAuth: config.basicAuthKey(), requestId: uuid() });
  const endpoint = pickEndpoint()

  if (options?.local) {
    try {
      const response = await baseExternalClient.request(url, Method.GET, null, null, null);
      const status = response.status
      const data = response.data
      return {
        data,
        status,
        error: null,
      }
    } catch (err:any) {
      return {
        data: null,
        error: err,
        status: err.responseStatus ?? null,
      }
    }
  }

  try {
    const response = await baseExternalClient.request(
      `${endpoint}?${query}`,
      Method.POST,
      null,
      { url },
      null
    );
    const status = response.status
    const data = response.data
    return {
      data,
      status,
      error: null,
    }
  } catch (err:any) {
    return {
      data: null,
      error: err,
      status: err.responseStatus ?? null,
    }
  }

}

export const webScraper = {
  fetchUrl,
}