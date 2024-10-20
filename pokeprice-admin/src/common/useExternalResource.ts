import axios, {AxiosRequestConfig, AxiosResponse} from "axios";
import queryString from 'query-string';
import {AsyncResult, useAsyncResult} from "./useAsyncResult";
import {firebaseAuthProvider} from "../infrastructure/FirebaseAuthProvider";


export interface Resource<T> extends AsyncResult<T> {
  request:AxiosRequestConfig,
  status:number|null,
}

export type Resources<T> = { [key:string]:Resource<T> }

export const useExternalResource = <T>(id:string, config:AxiosRequestConfig):Resource<T> => {
  const asyncResult:AsyncResult<AxiosResponse> = useAsyncResult<AxiosResponse<T>>(
    id,
    async () => {
      const token = await firebaseAuthProvider.getToken();
      if (!token) {
        throw new Error(`No token`);
      }
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`
      };
      return axios.request<T>(config)
    }
  );

  const getStatus = ():number|null => {
    if (asyncResult.data) {
      return asyncResult.data.status;
    }
    if (asyncResult.error && asyncResult.error.isAxiosError) {
      return asyncResult.error.status;
    }
    return null;
  }

  return {
    id,
    request:config,
    data: asyncResult.data ? asyncResult.data.data : null,
    error: asyncResult.error,
    state: asyncResult.state,
    status: getStatus(),
  };
}

export const useGetExternalResource = <T>(url:string, queryParams?:object, config?:AxiosRequestConfig):Resource<T> => {

  const requestUrl = queryParams
    ? `${url}?${queryString.stringify(queryParams)}`
    : url;
  const id = `GET ${requestUrl}`;
  const resource = useExternalResource<T>(
    id,
    {
    ...config,
    method: "GET",
    url: requestUrl,
  });

  return resource;
}