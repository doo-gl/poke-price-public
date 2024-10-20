import {ParsingError} from "../../../../error/ParsingError";
import Root = cheerio.Root;

const tryExtractV1 = (url:string, $:Root):string|null => {
  const titleElement = $('h1#itemTitle').contents().not('span');
  if (titleElement.length === 0) {
    return null;
  }
  if (titleElement.has('wbr')) {
    return titleElement.not('wbr').toArray()
      .map(element => {
        if (element.type !== 'text') {
          return null;
        }
        return element.data ? element.data : '';
      })
      .join('')
  } else if (titleElement.length > 1) {
    throw new ParsingError(`Found more than 1 item title on ${url}, matching "h1#itemTitle"`);
  }
  return titleElement.text();
}

const tryExtractV2 = (url:string, $:Root):string|null=> {
  const titleElement = $('h1.x-item-title__mainTitle').contents();
  if (titleElement.length === 0) {
    return null;
  }
  return titleElement.text();
}

const extract = (url:string, $:Root):string => {
  let title = tryExtractV1(url, $)
  if (title) {
    return title
  }
  title = tryExtractV2(url, $);
  if (title) {
    return title;
  }
  throw new ParsingError(`Found no item title on ${url}`);
}

export const listingNameExtractor = {
  extract,
}