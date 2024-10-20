import {Image, Images, ImageVariant} from "./ItemEntity";
import {toInputValueSet} from "../../tools/SetBuilder";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";
import {removeNulls} from "../../tools/ArrayNullRemover";

export interface VariantOptions {
  tags?:Array<string>,
  preferenceTags?:Array<Array<string>>
  preferredHeight?:number,
  preferredWidth?:number,
}

const variantsMatchingTags = (variants:Array<ImageVariant>, tags:Array<string>):Array<ImageVariant> => {
  const requestedTags = tags
  return variants.filter(variant => {
    const variantTags = toInputValueSet(variant.tags)
    const allMatch = requestedTags.length === 0 || requestedTags.every(tag => variantTags.has(tag))
    return allMatch;
  })
    .sort(comparatorBuilder.objectAttributeDESC(
      variant => variant.tags.length)
    )
}

const sortByPreferredDimensionsDesc = (variants:Array<ImageVariant>, preferredHeight?:number, preferredWidth?:number):Array<ImageVariant> => {
  if (preferredHeight && preferredWidth) {
    return variants.slice().sort(comparatorBuilder.combineAll(
      comparatorBuilder.objectAttributeASC(value => {
        if (!value.dimensions) {
          return Number.MAX_SAFE_INTEGER;
        }
        const height = value.dimensions.height;
        const width = value.dimensions.width;
        const area = height * width;
        const preferredArea = preferredWidth * preferredHeight;
        return Math.abs(area - preferredArea)
      }),
      comparatorBuilder.objectAttributeASC(value => value.url)
    ))
  }
  if (preferredHeight && !preferredWidth) {
    return variants.slice().sort(comparatorBuilder.combineAll(
      comparatorBuilder.objectAttributeASC(value => {
        const height = value.dimensions?.height ?? Number.MAX_SAFE_INTEGER;
        return Math.abs(preferredHeight - height)
      }),
      comparatorBuilder.objectAttributeASC(value => value.url)
    ))
  }
  if (!preferredHeight && preferredWidth) {
    return variants.slice().sort(comparatorBuilder.combineAll(
      comparatorBuilder.objectAttributeASC(value => {
        const width = value.dimensions?.width ?? Number.MAX_SAFE_INTEGER;
        return Math.abs(preferredWidth - width)
      }),
      comparatorBuilder.objectAttributeASC(value => value.url)
    ))
  }
  return variants;
}

const findMatchingVariants = (image:Image, variantOptions?:VariantOptions):Array<ImageVariant> => {
  const variants = image.variants;
  if (variantOptions?.tags) {
    return variantsMatchingTags(variants, variantOptions?.tags ?? [])
  }
  if (variantOptions?.preferenceTags) {
    for (let preferenceIndex = 0; preferenceIndex < variantOptions.preferenceTags.length; preferenceIndex++) {
      const preferenceTags = variantOptions.preferenceTags[preferenceIndex];
      const matchedVariants = variantsMatchingTags(variants, preferenceTags)
      if (matchedVariants.length > 0) {
        return matchedVariants;
      }
    }
    return []
  }
  return variants;
}

const findVariant = (image:Image, variantOptions?:VariantOptions):ImageVariant|null => {
  const matchingVariants = findMatchingVariants(image, variantOptions)
  const orderedVariants = sortByPreferredDimensionsDesc(matchingVariants, variantOptions?.preferredHeight, variantOptions?.preferredWidth)
  if (orderedVariants.length === 0) {
    return null;
  }
  return orderedVariants[0];
}

const getFirst = (images:Images, variantOptions?:VariantOptions):ImageVariant|null => {
  if (images.images.length === 0) {
    return null;
  }
  const image = images.images[0];
  return findVariant(image, variantOptions)
}

const pickVariant = (images:Images, variantOptions?:VariantOptions):Array<ImageVariant> => {
  if (images.images.length === 0) {
    return [];
  }
  return removeNulls(images.images.map(image => findVariant(image, variantOptions)))
}

export const imageQuerier = {
  getFirst,
  pickVariant,
}