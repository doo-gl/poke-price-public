import Root = cheerio.Root;
import {ParsingError} from "../../../../error/ParsingError";
import {textExtractor} from "../ended-listing-retrieval/TextExtractor";


const extractOld1 = (url:string, $:Root):string|null => {
  const content = $('#viTabs_0_is.itemAttr').find('table#itmSellerDesc').find('td.sellerNotesContent');
  if (content.length === 0) {
    return null;
  }
  if (content.length > 1) {
    throw new ParsingError(`${content.length} tags matching "$('#viTabs_0_is.itemAttr').find('table#itmSellerDesc'.find('td.sellerNotesContent')" in listing on url: ${url}`);
  }
  const text = textExtractor.extractFromCheerio(content);
  if (!text) {
    return null;
  }
  return text
    .replace('“', '')
    .replace('”', '');
}

const extract2 = (url:string, $:Root):string|null => {
  const notesTag = $("#mainContent").find(".d-item-condition").find(".d-item-condition-desc").find(".ux-textspans--ITALIC")
  if (notesTag.length === 0) {
    return null;
  }
  if (notesTag.length > 1) {
    throw new ParsingError(`${notesTag.length} tags matching "$("#mainContent").find(".d-item-condition").find(".d-item-condition-desc").find(".ux-textspans--ITALIC")" in listing on url: ${url}`);
  }
  const text = textExtractor.extractFromCheerio(notesTag);
  if (!text) {
    return null;
  }
  return text
    .replace('“', '')
    .replace('”', '');
}

const extract = (url:string, $:Root):string|null => {
  let notes = extract2(url, $)
  if (notes) {
    return notes
  }
  notes = extractOld1(url, $)
  return notes
}

export const sellersNotesExtractor = {
  extract,
}