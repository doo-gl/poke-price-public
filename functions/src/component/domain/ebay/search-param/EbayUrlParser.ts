import {SearchParams} from "./EbayCardSearchParamEntity";
import {queryString} from "../../../external-lib/QueryString";
import {InvalidArgumentError} from "../../../error/InvalidArgumentError";


const parse = (url:string):SearchParams => {
  const parsedUrl = queryString.parseUrl(url);
  const queryParams = parsedUrl.query;
  const keywordParam = queryParams['_nkw'];
  if (!keywordParam) {
    throw new InvalidArgumentError(`Cannot find param: '_nkw' in url: ${url}`);
  }
  const keywordString = (<string>keywordParam)
  const splitKeywords:Array<string> = []
  let currentKeyword = '';
  let isOrKeyword = false;
  for (let charIndex = 0; charIndex < keywordString.length; charIndex++) {
    const character = keywordString.charAt(charIndex);
    if (character === '(') {
      isOrKeyword = true
    }
    if (character === ')') {
      isOrKeyword = false
    }
    if (character === ' ' && !isOrKeyword && currentKeyword.length > 0) {
      splitKeywords.push(currentKeyword)
      currentKeyword = ''
    }
    if (character !== ' ' || isOrKeyword) {
      currentKeyword = `${currentKeyword}${character}`
    }
  }
  if (currentKeyword.length > 0) {
    splitKeywords.push(currentKeyword)
  }

  const includeKeywords = splitKeywords.filter(keyword => keyword.match(/^[^\\-]/))
  const excludeKeywords = splitKeywords
    .filter(keyword => keyword.match(/^[\\-]/))
    .map(keyword => keyword.slice(1))
  return {
    includeKeywords,
    excludeKeywords,
  }
}

export const ebayUrlParser = {
  parse,
}