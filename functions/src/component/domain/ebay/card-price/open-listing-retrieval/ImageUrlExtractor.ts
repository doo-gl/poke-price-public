import {ParsingError} from "../../../../error/ParsingError";
import Root = cheerio.Root;
import Cheerio = cheerio.Cheerio;
import {removeNulls} from "../../../../tools/ArrayNullRemover";


const parseImageUrl = (url:string, imageUrl:string|undefined):string|null => {
  const result = imageUrl
  if (!result || result.length === 0) {
    throw new ParsingError(`No image src at url: ${url}`);
  }
  if (!result.startsWith("https://i.ebayimg.com")) {
    return result
  }
  if (result.match(/s-l[\d]*\./gi)) {
    return result.replace(/s-l[\d]*\./gi, 's-l500.');
  }
  return result;
}

const extractMainImageUrl = (url:string, $:Root):string|null => {
  const image = $('img#icImg');
  if (image.length === 0) {
    return null;
  }
  if (image.length > 1) {
    throw new ParsingError(`${image.length} tags matching "img#icImg" in listing on url: ${url}`);
  }
  const imageUrl = image.attr('src');
  return parseImageUrl(url, imageUrl);
}

const extract = (url:string, $:Root):Array<string> => {
  const imageSlider = $('div#vi_main_img_fs');
  if (imageSlider.length === 0) {
    const mainImageUrl = extractMainImageUrl(url, $);
    return mainImageUrl ? [mainImageUrl] : [];
  }
  if (imageSlider.length > 1) {
    throw new ParsingError(`${imageSlider.length} tags matching "div#vi_main_img_fs" in listing on url: ${url}`);
  }
  let imageItems = imageSlider.find('li.v-pic-item');
  if (imageItems.length === 0) {
    imageItems = imageSlider.find('button.ux-image-filmstrip-carousel-item')
  }
  if (imageItems.length === 0) {
    throw new ParsingError(`No tag found matching "li.v-pic-item" or "button.ux-image-filmstrip-carousel-item" at url: ${url}`);
  }
  const imageUrls:Array<string> = [];
  imageItems.each(function (this:Cheerio, index, elem) {
    const imageItem: Cheerio = $(this); // eslint-disable-line no-invalid-this
    const image = imageItem.find('img');
    if (image.length === 0) {
      throw new ParsingError(`No tag found matching "li.v-pic-item => img" at url: ${url}`);
    }
    if (image.length > 1) {
      throw new ParsingError(`${image.length} tags found matching "li.v-pic-item => img" at url: ${url}`);
    }
    const imageUrl = image.attr('src');
    const parsedUrl = parseImageUrl(url, imageUrl)
    if (parsedUrl) {
      imageUrls.push(parsedUrl);
    }
  })
  if (imageUrls.length === 0) {
    throw new ParsingError(`Found no image urls for listing: ${url}`);
  }
  return imageUrls;
}

const extractFromMainImage = (url:string, $:Root):Array<string> => {
  const mainImageTag = $("#PicturePanel").find("#mainImgHldr").find(".ux-image-carousel-item.active").find("img")
  if (mainImageTag.length === 0) {
    return []
  }
  const imageUrl = mainImageTag.attr('src');
  const parsedUrl = parseImageUrl(url, imageUrl)
  if (!parsedUrl) {
    return []
  }
  return [parsedUrl]
}

const extractFromSlider = (url:string, $:Root, imageSliderTag:Cheerio):Array<string> => {
  const imageTags = imageSliderTag.find("img")
  const imageUrls:Array<string> = [];
  imageTags.each(function (this:Cheerio, index, elem) {
    const image: Cheerio = $(this); // eslint-disable-line no-invalid-this
    const imageUrl = image.attr('src');
    const parsedUrl = parseImageUrl(url, imageUrl)
    if (parsedUrl) {
      imageUrls.push(parsedUrl);
    }
  })
  return imageUrls
}

const extract2 = (url:string, $:Root):Array<string> => {
  const imageSlider = $('#PicturePanel').find('.ux-image-filmstrip-carousel')
  const rawUrls = imageSlider.length === 0
    ? extractFromMainImage(url, $)
    : extractFromSlider(url, $, imageSlider)
  return removeNulls(rawUrls.map(imageUrl => parseImageUrl(url, imageUrl)))
}

export const imageUrlExtractor = {
  extract: extract2,
}