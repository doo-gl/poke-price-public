import {ParsingError} from "../../../../error/ParsingError";
import {textExtractor} from "./TextExtractor";
import Root = cheerio.Root;
import Cheerio = cheerio.Cheerio;

const extractEndListingMessageV1 = (url:string, $:Root):string|null => {
  let messageSpan = $('div#msgPanel').find('span.msgTextAlign');
  if (messageSpan.length === 0) {
    messageSpan = $('div#vi-statusmessage-panel-content').find('div.ux-message__title').find('span.clipped')
  }
  if (messageSpan.length === 0) {
    throw new ParsingError(`Found no matches for "$('div#msgPanel').find('span.msgTextAlign')" in url ${url}`)
  }
  const message = textExtractor.extractFromCheerio(messageSpan).trim();
  return message;
}

const extractEndListingMessageV2 = (url:string, $:Root):string|null => {
  const statusPanel = $('div.d-statusmessage').find('.ux-textspans')
  if (!statusPanel || statusPanel.length === 0) {
    return null
  }
  const message = textExtractor.extractFromCheerio(statusPanel).trim();
  return message;
}

const extractEndListingMessageV3 = (url:string, $:Root):string|null => {
  const statusPanel = $('div.ux-message__title').find('.ux-textspans')
  if (!statusPanel || statusPanel.length === 0) {
    return null
  }
  const message = textExtractor.extractFromCheerio(statusPanel).trim();
  return message;
}

const extractEndListingMessage = (url:string, $:Root):string => {
  let message = extractEndListingMessageV3(url, $)
  if (!message) {
    message = extractEndListingMessageV2(url, $)
  }
  if (!message) {
    message = extractEndListingMessageV1(url, $)
  }
  if (!message) {
    throw new ParsingError(`Failed to find end listing message at url: ${url}`)
  }
  return message
}

const extractOptionalEndListingMessage = (url:string, $:Root):string|null => {
  try {
    return extractEndListingMessage(url, $)
  } catch (err) {
    return null
  }
}

export const endListingMessageExtractor = {
  extractEndListingMessage,
  extractOptionalEndListingMessage,
}