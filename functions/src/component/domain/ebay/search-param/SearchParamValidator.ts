import {SearchParams} from "./EbayCardSearchParamEntity";
import {escapeStringRegex} from "../../../external-lib/EscapeStringRegex";

export interface ValidationResult {
  isValid:boolean,
  reasons:Array<string>
}

const match = (keyword:string, value:string):boolean => {
  const OR_REGEX = new RegExp(/^\(.*,?.*\)$/gim);
  const orRegexMatch = OR_REGEX.exec(keyword);
  if (orRegexMatch) {
    const split = keyword.slice(1, keyword.length - 1).split(',');
    return split.some(splitKeyword => match(splitKeyword, value));
  }

  const transformedKeyword = keyword
    .trim()
    .toLowerCase()
    .replace('+', ' ')
    .replace(/(^[/])|([/]$)/, '')
    // .replace('*', '¬WILDCARD¬');

  const variants = [transformedKeyword];
  if (transformedKeyword.includes('-')) {
    variants.push(transformedKeyword.replace('-', ' '));
  }

  const regexString = variants
    .map(variant => `(\\b${escapeStringRegex.escape(variant)}\\b)`)
    .join('|')
    // .replace('¬WILDCARD¬', '[\\w\\s*]*')

  const regex = new RegExp(regexString, 'gi');
  const transformedValue = value
    .trim()
    .toLowerCase()
    .replace('/', ' ');
  const isMatch = !!transformedValue.match(regex)
  return isMatch
}

const validate = (searchParams:SearchParams, value:string):ValidationResult => {

  const lowerCaseValue = value.trim().toLowerCase();
  const includeMatches = searchParams.includeKeywords
    .map(includeKeyword => {
      const isMatch = match(includeKeyword.toLowerCase().trim(), lowerCaseValue);
      return {
        isMatch,
        keyword: includeKeyword,
      }
    })

  const excludeMatches = searchParams.excludeKeywords
    .map(excludeKeyword => {
      const isMatch = match(excludeKeyword.toLowerCase().trim(), lowerCaseValue);
      return {
        isMatch,
        keyword: excludeKeyword,
      }
    })


  const hasAllIncludes = includeMatches.every(includeMatch => includeMatch.isMatch);
  const hasNoExcludes = !excludeMatches.some(excludeMatch => excludeMatch.isMatch);

  const isValid = hasAllIncludes && hasNoExcludes;

  const reasons:Array<string> = [];
  if (!hasAllIncludes) {
    const message = `Includes not matched: ${includeMatches.filter(includeMatch => !includeMatch.isMatch).map(includeMatch => includeMatch.keyword).join(',')}`
    reasons.push(message);
  }
  if (!hasNoExcludes) {
    const message = `Excludes matched: ${excludeMatches.filter(excludeMatch => excludeMatch.isMatch).map(excludeMatch => excludeMatch.keyword).join(',')}`
    reasons.push(message);
  }

  return {
    isValid,
    reasons,
  };
}

export const searchParamValidator = {
  validate,
  match,
}