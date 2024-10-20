import moment, {Moment} from "moment-timezone";
import {ParsingError} from "../../../../error/ParsingError";
import {textExtractor} from "./TextExtractor";
import Root = cheerio.Root;
import Cheerio = cheerio.Cheerio;
import {bidCountExtractor} from "./BidCountExtractor";
import {endListingMessageExtractor} from "./EndListingMessageExtractor";


const maybeExtract1 = (url:string, $:Root):Moment|null => {
  const endedTimeSpan = $('span.endedDate').contents().filter('span');
  if (endedTimeSpan.length === 0) {
    return null;
  }
  if (endedTimeSpan.length > 1) {
    throw new ParsingError(`Found more than 1 ended time on ${url}, matching "span.endedDate"`);
  }

  if (endedTimeSpan.hasClass('timeMs')) {
    return parseTimeMsSpan(url, endedTimeSpan)
  }

  const endedTimeString = endedTimeSpan.text().replace(/\s+/gim, ' ');
  if (!endedTimeString) {
    throw new ParsingError(`Failed to find ended time string at url: ${url}.`)
  }
  const endedDateSpan = $('span.endedDate').parent().contents().not('span').first();
  if (endedDateSpan.length === 0) {
    throw new ParsingError(`Found no ended date on ${url}, matching "span.endedDate.siblings()"`);
  }
  if (endedDateSpan.length > 1) {
    throw new ParsingError(`Found more than 1 ended date on ${url}, matching "span.endedDate.siblings()"`);
  }
  const endedDateString = endedDateSpan.text().trim().replace(/\s+/gim, ' ');
  if (!endedDateString) {
    throw new ParsingError(`Failed to find ended date string at url: ${url}.`)
  }
  const splitTime = endedTimeString.split(' ');
  if (splitTime.length !== 2) {
    throw new ParsingError(`Unexpected split of string ${endedTimeString}, expected 2 parts, in url: ${url}`);
  }
  const time = splitTime[0];
  const timeString = `${endedDateString}T${time}`;
  const format = 'DD MMM, YYYYTHH:mm:ss'
  const timestamp = moment.tz(timeString, format, true, 'Europe/London').utc();
  if (!timestamp.isValid()) {
    throw new ParsingError(`Failed to parse timestring: ${timeString}, with format: ${format}, at url: ${url}`)
  }
  return timestamp;
}

const maybeExtract3 = (url:string, $:Root):Moment|null => {
  const endedMessage = endListingMessageExtractor.extractOptionalEndListingMessage(url, $)
  if (!endedMessage) {
    return null
  }
  // Bidding ended on Wed, 12 Jul at 7:38 PM. The seller has relisted this item or one like this.
  const LISTING_ENDED_REGEX = new RegExp(/(This listing ended on|Bidding ended on) \w+, (\d+ \w+ at \d+:\d+ \w+)/gim);
  const match = LISTING_ENDED_REGEX.exec(endedMessage)
  if (!match || !match[2]) {
    return null
  }
  let timezone = 'America/Los_Angeles'
  if (url.match(".co.uk")) {
    timezone = 'Europe/London'
  }

  let timestamp = moment.tz(match[2], "DD MMM [at] hh:mm A", timezone)

  if (timestamp.isAfter(moment())) { // if the timestamp is after now, assume it has used the wrong year and has chosen the date in the upcoming year
    timestamp = timestamp.year(timestamp.year() - 1)
  }

  return timestamp
}

const maybeExtract2 = (url:string, $:Root):Moment|null => {
  const endedMessage = endListingMessageExtractor.extractOptionalEndListingMessage(url, $)
  if (!endedMessage) {
    return null
  }
  // const LISTING_ENDED_REGEX = new RegExp(/(This listing ended on Sat, Sep 23 at 4:41 PM)/gim);
  const LISTING_ENDED_REGEX = new RegExp(/(This listing ended on|Bidding ended on) \w+, (\w+ \d+ at \d+:\d+ \w+)/gim);
  const match = LISTING_ENDED_REGEX.exec(endedMessage)
  if (!match || !match[2]) {
    return null
  }
  let timezone = 'America/Los_Angeles'
  if (url.match(".co.uk")) {
    timezone = 'Europe/London'
  }

  let timestamp = moment.tz(match[2], "MMM DD [at] hh:mm A", timezone)

  if (timestamp.isAfter(moment())) { // if the timestamp is after now, assume it has used the wrong year and has chosen the date in the upcoming year
    timestamp = timestamp.year(timestamp.year() - 1)
  }

  return timestamp
}

const maybeExtract = (url:string, $:Root):Moment|null => {
  const timestamp3 = maybeExtract3(url, $)
  if (timestamp3) {
    return timestamp3
  }
  const timestamp2 = maybeExtract2(url, $)
  if (timestamp2) {
    return timestamp2
  }
  return maybeExtract1(url, $)
}

const extract = (url:string, $:Root):Moment => {
  const timestamp = maybeExtract(url, $);
  if (!timestamp) {
    throw new ParsingError(`Found no ended time on ${url}, matching "span.endedDate"`);
  }
  return timestamp
}

const extractFromLive = (url:string, $:Root):Moment|null => {
  const timeLeftSpan = $('span.vi-tm-left');
  if (timeLeftSpan.length === 0) {
    return null;
  }
  if (timeLeftSpan.length > 1) {
    throw new ParsingError(`${timeLeftSpan.length} tags found matching "span.vi-tm-left" at url: ${url}`);
  }
  return extractFromTimeLeftSpan(url, timeLeftSpan)
}

const extractFromTimeLeftSpan = (url:string, timeLeftSpan:cheerio.Cheerio):Moment => {
  const timeMsSpan = timeLeftSpan.find('span.timeMs');
  if (timeMsSpan.length === 1) {
    return parseTimeMsSpan(url, timeMsSpan)
  }

  const spanContents = timeLeftSpan.find('span').contents();
  if (spanContents.length === 2) {
    const timeLeftString = `${spanContents.eq(0).text()}T${spanContents.eq(1).text()}`
      .replace('(', '')
      .replace(')', '');
    return parseTimeLeftString(url, timeLeftString, 'DD MMM, YYYYTHH:mm:ss')
  }

  const noscriptTag = timeLeftSpan.find('noscript')
  if (noscriptTag.length === 1) {
    return parseNoscriptText(url, noscriptTag.text())
  }

  throw new ParsingError(`Time left span does not match patterns at url: ${url}`)
}

const parseNoscriptText = (url:string, text:string):Moment => {
  const timeSplit = new RegExp(/<span>(.*)<\/span>[\s.]*<span class="endedDate">(.*)<\/span>/gi).exec(text);
  if (!timeSplit || timeSplit.length !== 3) {
    throw new ParsingError(`Could not parse noscript tag: ${timeSplit ? timeSplit.join(', ') : 'null'} at url: ${url}`)
  }
  const timeLeftString = `${timeSplit[1]}T${timeSplit[2]}`
    .replace('(', '')
    .replace(')', '');
  return parseTimeLeftString(url, timeLeftString, 'MMM DD, YYYYTHH:mm:ss')
}

const TIME_ZONE:any = {
  'BST': 'Europe/London',
  'GMT': 'Europe/London',
  'BDST': 'Europe/London',
  'EST': 'America/New_York',
  'EDT': 'America/New_York',
  'EWT': 'America/New_York',
  'EPT': 'America/New_York',
  'CST': 'America/Chicago',
  'CDT': 'America/Chicago',
  'CWT': 'America/Chicago',
  'CPT': 'America/Chicago',
  'MST': 'America/Denver',
  'MDT': 'America/Denver',
  'MWT': 'America/Denver',
  'MPT': 'America/Denver',
  'PDT': 'America/Los_Angeles',
  'PST': 'America/Los_Angeles',
  'PWT': 'America/Los_Angeles',
  'PPT': 'America/Los_Angeles',
  'AST': 'America/Anchorage',
  'AWT': 'America/Anchorage',
  'APT': 'America/Anchorage',
  'AHST': 'America/Anchorage',
  'AHDT': 'America/Anchorage',
  'YST': 'America/Anchorage',
  'AKST': 'America/Anchorage',
  'AKDT': 'America/Anchorage',
  'HST': 'Pacific/Honolulu',
  'HDT': 'Pacific/Honolulu',
  'HWT': 'Pacific/Honolulu',
  'HPT': 'Pacific/Honolulu',
}

const parseTimeLeftString = (url:string, timeLeftString:string, format:string):Moment => {
  const timeSplit = new RegExp(/(^.*)( \w*$)/gi).exec(timeLeftString);
  if (!timeSplit || timeSplit.length !== 3) {
    throw new ParsingError(`Time split regex failed on ${timeLeftString} at url: ${url}`);
  }
  const time = timeSplit[1].trim();
  const timezone = timeSplit[2].trim();
  const timezoneCity = TIME_ZONE[timezone] ?? 'Europe/London'
  const timeLeft = moment.tz(time, format, true, timezoneCity).utc();
  if (!timeLeft.isValid()) {
    throw new ParsingError(`${timeLeftString} does not match ${format} at url: ${url}`);
  }
  return timeLeft;
}

// https://stackoverflow.com/questions/10834796/validate-that-a-string-is-a-positive-integer
const isNormalInteger = (str:string) => {
  return /^\+?(0|[1-9]\d*)$/.test(str);
}

const parseTimeMsSpan = (url:string, timeMsSpan:cheerio.Cheerio):Moment => {
  const millis = timeMsSpan.attr('timems');
  if (!millis) {
    throw new ParsingError(`Time MS span does not have timems attribute at url: ${url}`);
  }
  if (!isNormalInteger(millis)) {
    throw new ParsingError(`Time MS span ${millis} is not integer at url: ${url}`);
  }
  return moment(Number(millis))
}

const findTimeLeftTag = ($:Root):Cheerio => {
  const matchers = [
    () => $('.x-timer-module').find('.x-timer-module__timer').find('.ux-timer'),
  ]
  for (let matchIndex = 0; matchIndex < matchers.length; matchIndex++) {
    const matcher = matchers[matchIndex];
    const bidTag = matcher();
    if (bidTag.length > 0) {
      return bidTag;
    }
  }
  return matchers[0]();
}

const parseTimeLeftText = (url:string, timeLeftText:string):Moment => {
  const daysHoursMinutesSecondsTextMatch = timeLeftText.match(/([\d]+(d|h|m|s))?\s*([\d]+(d|h|m|s))?\s*([\d]+(d|h|m|s))/gim)
  const daysHoursMinutesSecondsText = daysHoursMinutesSecondsTextMatch ? daysHoursMinutesSecondsTextMatch[0] : null
  if (!daysHoursMinutesSecondsText) {
    throw new ParsingError(`Time left text: ${timeLeftText} does not parse out to something like 9d 8h 7m 6s, at url: ${url}`)
  }

  const daysValue = new RegExp("[0-9]+d", "gim").exec(daysHoursMinutesSecondsText)
  const days = daysValue && daysValue.length > 0
    ? Number.parseFloat(daysValue[0].replace("d", ""))
    : null

  const hoursValue = new RegExp("[0-9]+h", "gim").exec(daysHoursMinutesSecondsText)
  const hours = hoursValue && hoursValue.length > 0
    ? Number.parseFloat(hoursValue[0].replace("h", ""))
    : null

  const minutesValue = new RegExp("[0-9]+m", "gim").exec(daysHoursMinutesSecondsText)
  const minutes = minutesValue && minutesValue.length > 0
    ? Number.parseFloat(minutesValue[0].replace("m", ""))
    : null

  const secondsValue = new RegExp("[0-9]+s", "gim").exec(daysHoursMinutesSecondsText)
  const seconds = secondsValue && secondsValue.length > 0
    ? Number.parseFloat(secondsValue[0].replace("s", ""))
    : null

  // doing truthy conversion to check for NaN from bad parsing
  const end = moment()
    .add(!!days ? days : 0, "days" )
    .add(!!hours ? hours : 0, "hours" )
    .add(!!minutes ? minutes : 0, "minutes" )
    .add(!!seconds ? seconds : 0, "seconds" )
  return end
}

const extractFromLive2 = (url:string, $:Root):Moment|null => {
  const timeLeftTag = findTimeLeftTag($)
  if (timeLeftTag.length === 0) {
    return null;
  }
  if (timeLeftTag.length > 1) {
    throw new ParsingError(`${timeLeftTag.length} tags found matching ".x-timer-module" at url: ${url}`);
  }
  const hasBids = bidCountExtractor.extract(url, $) !== null
  if (!hasBids) {
    return null
  }
  const timeLeftText = textExtractor.extractFromCheerio(timeLeftTag)
  return parseTimeLeftText(url, timeLeftText)
}

export const timestampExtractor = {
  extract,
  extractFromLive: extractFromLive2,
  maybeExtract,
}