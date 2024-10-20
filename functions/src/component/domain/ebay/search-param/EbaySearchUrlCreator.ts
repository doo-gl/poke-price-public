import {SearchParams} from "./EbayCardSearchParamEntity";
import {queryString} from "../../../external-lib/QueryString";
import {lodash} from "../../../external-lib/Lodash";


const BASE_URL = 'https://www.ebay.co.uk/sch/i.html';
const GENERIC_PARAMS = {
  // '_from': 'R40',
  // '_osacat': '183454',
  'rt': 'nc',
  // '_sacat': '183454',
  'LH_Complete': '1',
  // '_dcat': '183454',
  'LH_Sold': '1',
  'LH_TitleDesc': '0',
  // 'Card%20Condition': 'Near%20Mint|Brand%20New',
  '_ipg': '200',
}
const SEARCH_PARAM_NAME = '_nkw';

const encode = (keyword:string):string => {
  // https://stackoverflow.com/questions/18251399/why-doesnt-encodeuricomponent-encode-single-quotes-apostrophes
  return encodeURIComponent(keyword)
    .replace(/'/g, '%27')
}

const createSearchParamValue = (searchParams:SearchParams):string => {
  const includes = searchParams.includeKeywords.map(keyword => encode(keyword)).join('+');
  const excludes = searchParams.excludeKeywords.map(keyword => `-${encode(keyword)}`).join('+');
  return `${includes}+${excludes}`;
}

const createQueryParams = (searchParams:SearchParams):string => {
  const queryParams:string = queryString.stringify(lodash.cloneDeep(GENERIC_PARAMS));
  const searchParam = `${SEARCH_PARAM_NAME}=${createSearchParamValue(searchParams)}`
  return `${searchParam}&${queryParams}`;
}

const create = (searchParams:SearchParams):string => {
  const queryParams = createQueryParams(searchParams);
  const url = `${BASE_URL}?${queryParams}`;
  return url;
}

export const ebaySearchUrlCreator = {
  create,
}