import {Image as CardImage} from "../card/CardEntity";
import {Image, ImageVariant} from "./ItemEntity";
import {UnexpectedError} from "../../error/UnexpectedError";

const findVariantWithTags = (image:Image, tags:Array<string>):ImageVariant|null => {
  return image.variants.find(variant =>
    tags.every(tag => variant.tags.includes(tag))
  ) ?? null
}

const map = (cardImage:CardImage):Image => {
  const variants:Array<ImageVariant> = []

  variants.push({
    url: cardImage.url,
    dimensions: null,
    tags: ['default', 'jpg'],
  })
  variants.push({
    url: cardImage.hiResUrl,
    dimensions: null,
    tags: ['hi-res', 'jpg'],
  })
  if (cardImage.fullUrl) {
    variants.push({
      url: cardImage.fullUrl,
      dimensions: null,
      tags: ['hi-res', 'webp'],
    })
  }
  if (cardImage.smallUrl) {
    variants.push({
      url: cardImage.smallUrl,
      dimensions: { height: 419, width: 300 },
      tags: ['small', 'webp'],
    })
  }
  if (cardImage.tinyUrl) {
    variants.push({
      url: cardImage.tinyUrl,
      dimensions: { height: 140, width: 100 },
      tags: ['tiny', 'webp'],
    })
  }

  return {
    variants,
  }
}

const reverseMap = (image:Image):CardImage => {
  if (image.variants.length === 0) {
    throw new UnexpectedError(`Not enough image variants`)
  }
  const defaultVariant = findVariantWithTags(image, ['default', 'jpg'])
  const hiRes = findVariantWithTags(image, ['hi-res', 'jpg'])
  const full = findVariantWithTags(image, ['hi-res', 'webp'])
  const small = findVariantWithTags(image, ['small', 'webp'])
  const tiny = findVariantWithTags(image, ['tiny', 'webp'])
  if (!defaultVariant) {
    return {
      url: image.variants[0].url,
      hiResUrl: image.variants[0].url,
    }
  }
  const result:CardImage = {
    url: defaultVariant.url,
    hiResUrl: hiRes ? hiRes.url : defaultVariant.url,
  }
  if (full) {
    result.fullUrl = full.url
  }
  if (small) {
    result.smallUrl = small.url;
  }
  if (tiny) {
    result.tinyUrl = tiny.url;
  }
  return result;
}

export const cardImageToImageMapper = {
  map,
  reverseMap,
}