import {queryString} from "../../../../external-lib/QueryString";


const extract = (url:string):string => {
  const parsedUrl = queryString.parseUrl(url);
  const splitUrl = parsedUrl.url.split('/');
  const ebayId = splitUrl[splitUrl.length - 1];
  return ebayId;
}

export const itemIdExtractor = {
  extract,
}