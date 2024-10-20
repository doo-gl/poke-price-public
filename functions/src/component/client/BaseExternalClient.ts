import axios, {AxiosResponse} from 'axios';
import * as queryString from "query-string";
import {ExternalClientError} from "../error/ExternalClientError";
import {logger} from "firebase-functions";


export enum Method {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
}

export type QueryParams = {[key:string]:string|string[]|null};

export type MaskedQueryParams = {
  params:QueryParams,
  mask:RegExp,
};

export const maskedQueryParams = (params:QueryParams):MaskedQueryParams => {
  return { params, mask: /api|auth|key|app/g }
};

export type Headers = {[key:string]:string};

const callAxios = (url:string, method:Method, headers:Headers|null, body:any) => {
  if (method === Method.GET) {
    return axios.get(
      url,
      {
        headers: headers ?? undefined,
      }
    )
  } else if (method === Method.POST) {
    return axios.post(
      url,
      body,
      {
        headers: headers ?? undefined,
      }
    )
  } else if (method === Method.PUT) {
    return axios.put(
      url,
      body,
      {
        headers: headers ?? undefined,
      }
    )
  } else if (method === Method.DELETE) {
    return axios.delete(
      url,
      {
        headers: headers ?? undefined,
      }
    )
  } else {
    return Promise.reject(new Error(`Unmapped method: ${method}`));
  }
};

const logRequest = (url:string, method:Method, queryParams:MaskedQueryParams|null) => {
  if (!queryParams) {
    logger.info(`External Request: ${method} ${url}`);
    return;
  }
  const maskedQuery = queryString.stringify(maskApiQueryParams(queryParams));
  logger.info(`External Request: ${method} ${url}?${maskedQuery}`);
};

const logResponse = (url:string, method:Method, queryParams:MaskedQueryParams|null, response:AxiosResponse, timeTakenMillis:number) => {
  if (!queryParams) {
    logger.info(`External Response: ${method} ${url}, Result: ${response.status}, Time Taken: ${timeTakenMillis}ms`);
    return;
  }
  const maskedQuery = queryString.stringify(maskApiQueryParams(queryParams));
  logger.info(`External Response: ${method} ${url}?${maskedQuery}, Result: ${response.status}, Time Taken: ${timeTakenMillis}ms`);
};

const logError = (url:string, method:Method, queryParams:MaskedQueryParams|null, err:any, timeTakenMillis:number) => {
  if (!err.response) {
    logger.info(`External Response: ${method} ${url}, Result: ${err.message}, Time Taken: ${timeTakenMillis}ms`);
    return;
  }
  const status = err.response.status;
  if (!queryParams) {
    logger.info(`External Response: ${method} ${url}, Result: ${status}, Time Taken: ${timeTakenMillis}ms`);
    return;
  }
  const maskedQuery = queryString.stringify(maskApiQueryParams(queryParams));
  logger.info(`External Response: ${method} ${url}?${maskedQuery}, Result: ${status}, Time Taken: ${timeTakenMillis}ms`);
};

export const maskApiQueryParams = (queryParams:MaskedQueryParams):QueryParams => {
  const maskedParams:QueryParams = {};
  Object.entries(queryParams.params).forEach(entry => {
    const key:string = entry[0];
    const value:string|string[]|null = entry[1];
    if (key.toLowerCase().match(queryParams.mask)) {
      maskedParams[key] = 'MASKED'
    } else {
      maskedParams[key] = value;
    }
  });
  return maskedParams;
};

const buildUrlWithQuery = (url:string, queryParams:MaskedQueryParams|null) => {
  if (!queryParams) {
    return url;
  }
  const query = queryString.stringify(queryParams.params);
  return `${url}?${query}`;
}

const request = (url:string, method:Method, headers:Headers|null, body:any, queryParams:MaskedQueryParams|null):Promise<any> => {
  logRequest(url, method, queryParams);
  const urlWithQuery = buildUrlWithQuery(url, queryParams);
  const requestPromise = callAxios(urlWithQuery, method, headers, body);
  const start = new Date()
  return requestPromise
    .then(response => {
      const finish = new Date()
      logResponse(url, method, queryParams, response, finish.getTime() - start.getTime());
      return response;
    })
    .catch(err => {
      const finish = new Date()
      logError(url, method, queryParams, err, finish.getTime() - start.getTime());
      throw new ExternalClientError(err.message, err);
    })

};

const get = <T>(url:string, headers:Headers|null, queryParams:MaskedQueryParams|null):Promise<T> => {
  return request(url, Method.GET, headers, null, queryParams)
    .then(response => <T>response.data);
};

const post = <T>(url:string, headers:Headers|null, body:any):Promise<T> => {
  return request(url, Method.POST, headers, body, null)
    .then(response => <T>response.data);
};

const put = <T>(url:string, headers:Headers|null, body:any):Promise<T> => {
  return request(url, Method.PUT, headers, body, null)
    .then(response => <T>response.data);
};

// delete is a protected keyword in js, so can't call this variable 'delete'
const doDelete = <T>(url:string, headers:Headers|null):Promise<T> => {
  return request(url, Method.DELETE, headers, null, null)
    .then(response => <T>response.data);
};

export const baseExternalClient = {
  request,
  get,
  post,
  delete: doDelete,
  put,
};