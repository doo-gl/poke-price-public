import {maskApiQueryParams, maskedQueryParams, Method, QueryParams} from "../client/BaseExternalClient";
import {AxiosError} from "axios";
import {queryString} from "../external-lib/QueryString";
import {BaseError} from "./BaseError";


export class ExternalClientError extends BaseError {

  readonly requestHeaders:any|undefined;
  readonly requestMethod:Method|undefined;
  readonly url:string|undefined;
  readonly queryParams:QueryParams|undefined;
  readonly responseHeaders:any|undefined;
  readonly responseStatus:number|undefined;
  readonly responseBody:any|undefined;

  constructor(message:string, err:AxiosError|any) {
    super(message);
    this.message = message;

    if (!err.isAxiosError) {
      return;
    }
    const axiosError:AxiosError = <AxiosError>err;
    this.requestHeaders = axiosError.request && axiosError.request.getHeaders && axiosError.request.getHeaders();
    if (this.requestHeaders && this.requestHeaders['Authorization']) {
      this.requestHeaders['Authorization'] = 'MASKED';
    }
    if (this.requestHeaders && this.requestHeaders['authorization']) {
      this.requestHeaders['authorization'] = 'MASKED';
    }
    this.requestMethod = axiosError.request.method;

    if (axiosError.config && axiosError.config.url) {
      const parsedUrl = queryString.parseUrl(axiosError.config.url);
      const maskedParams = maskApiQueryParams(maskedQueryParams(parsedUrl.query));
      this.url = parsedUrl.url;
      this.queryParams = maskedParams;
    }

    this.responseHeaders = axiosError.response && axiosError.response.headers;
    this.responseStatus = axiosError.response && axiosError.response.status;
    this.responseBody = axiosError.response && axiosError.response.data;
  }
}