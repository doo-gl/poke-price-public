import {SearchParams} from "../../search-param/EbayCardSearchParamEntity";
import {queryString} from "../../../../external-lib/QueryString";
import {lodash} from "../../../../external-lib/Lodash";

const UK_BASE_URL = 'https://www.ebay.co.uk/sch/i.html';
const US_BASE_URL = 'https://www.ebay.com/sch/i.html'
const KEYWORD_PARAM_NAME = '_nkw';
const EXTRA_PARAMS = {
  _ipg: 200, // 200 results per page
}
const SOLD_LISTING_PARAMS = {
  // '_from': 'R40',
  // '_osacat': '183454',
  'rt': 'nc',
  // '_sacat': '183454',
  'LH_Complete': '1',
  // '_dcat': '183454',
  'LH_Sold': '1',
  // 'LH_TitleDesc': '0',
  // 'Card%20Condition': 'Near%20Mint|Brand%20New',
  // '_ipg': '200',
}

const encode = (keyword:string):string => {
  // https://stackoverflow.com/questions/18251399/why-doesnt-encodeuricomponent-encode-single-quotes-apostrophes
  return encodeURIComponent(keyword)
    .replace(/'/g, '%27')
}

const createKeywordParamValue = (searchParams:SearchParams):string => {
  const includes = searchParams.includeKeywords.map(keyword => encode(keyword)).join('+');
  const excludes = searchParams.excludeKeywords.map(keyword => `-${encode(keyword)}`).join('+');
  return `${includes}+${excludes}`;
}

const createRandomKeywordParamValue = (searchParams:SearchParams):string => {
  return createKeywordParamValue({
    includeKeywords: lodash.shuffle(searchParams.includeKeywords),
    excludeKeywords: lodash.shuffle(searchParams.excludeKeywords),
  })
}

const createSoldQueryParams = (searchParams:SearchParams):string => {
  const queryParams:string = queryString.stringify(lodash.cloneDeep(SOLD_LISTING_PARAMS));
  const searchParam = `${KEYWORD_PARAM_NAME}=${createKeywordParamValue(searchParams)}`
  return `${searchParam}&${queryParams}`;
}

const createRandomSoldQueryParams = (searchParams:SearchParams):string => {
  const queryParams:string = queryString.stringify(lodash.cloneDeep(SOLD_LISTING_PARAMS));
  const searchParam = `${KEYWORD_PARAM_NAME}=${createRandomKeywordParamValue(searchParams)}`
  return `${searchParam}&${queryParams}`;
}

const create = (searchParams:SearchParams):string => {
  return createUK(searchParams)
}

const createUS = (searchParams:SearchParams):string => {
  const queryParams = `${KEYWORD_PARAM_NAME}=${createKeywordParamValue(searchParams)}`
  const url = `${US_BASE_URL}?${queryParams}`;
  return url;
}

const createUK = (searchParams:SearchParams):string => {
  const queryParams = `${KEYWORD_PARAM_NAME}=${createKeywordParamValue(searchParams)}`
  const url = `${UK_BASE_URL}?${queryParams}`;
  return url;
}

const createSoldUK = (searchParams:SearchParams, options?:{random?:boolean}):string => {
  const queryParams:string = options?.random
    ? createRandomSoldQueryParams(searchParams)
    : createSoldQueryParams(searchParams)
  const url = `${UK_BASE_URL}?${queryParams}`;
  return url;
}

const createSoldUS = (searchParams:SearchParams, options?:{random?:boolean}):string => {
  const queryParams:string = options?.random
    ? createRandomSoldQueryParams(searchParams)
    : createSoldQueryParams(searchParams)
  const url = `${US_BASE_URL}?${queryParams}`;
  return url;
}

export const ebayOpenListingUrlCreator = {
  create,
  createUS,
  createUK,
  createSoldUK,
  createSoldUS,
}