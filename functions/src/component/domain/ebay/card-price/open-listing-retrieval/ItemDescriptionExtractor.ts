import Root = cheerio.Root;
import {ParsingError} from "../../../../error/ParsingError";
import striptags  from "striptags";


const extract = (url:string, $:Root):string|null => {
  const description = $('meta[name=description]');
  if (description.length === 0) {
    return null
  }
  if (description.length > 1) {
    throw new ParsingError(`${description.length} tags matching "$('meta[name=description]')" in listing on url: ${url}`);
  }
  const text = description.attr('content');
  if (!text) {
    return ''
  }
  return striptags(text);
}

export const itemDescriptionExtractor = {
  extract,
}