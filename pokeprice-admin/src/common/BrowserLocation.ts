
import queryString from "query-string";

export interface UrlDetails {
  // https://developer.mozilla.org:8080/en-US/search?q=URL#search-results-close-container
  fullUrl:string,
  // /en-US/search
  path:string,
  // { q: 'URL'}
  queryParams:object,
  // https://developer.mozilla.org:8080
  origin:string,
}

const getUrl = ():UrlDetails => {
  const location = window.location;
  const queryParams = queryString.parse(location.search) || {}
  return {
    fullUrl: location.href,
    path: location.pathname,
    origin: location.origin,
    queryParams,
  }
}

export const browserLocation = {
  getUrl,
}