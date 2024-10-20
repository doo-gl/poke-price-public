import cheerio from "cheerio";
import Cheerio = cheerio.Cheerio;
import Element = cheerio.Element;

const extractFromElement = (element:Element|null):string|undefined => {
  if (!element) {
    return '';
  }
  if (element.type === 'text') {
    return element.data
  }
  // @ts-ignore
  if (!element.children || element.children.length === 0) {
    return ''
  }
  // @ts-ignore
  return element.children.map((el:any) => extractFromElement(el)).join('');
}

const extractFromCheerio = ($:Cheerio):string => {
  const texts:Array<string> = [];
  $.each((ind:number, elem:Element) => {
    const text = extractFromElement(elem);
    if (text) {
      texts.push(text)
    }
  })
  return texts.join('')
}

export const textExtractor = {
  extractFromElement,
  extractFromCheerio,
}