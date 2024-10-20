import {EbayOpenListingEntity} from "../EbayOpenListingEntity";
import {Content, ContentItem, empty} from "./ContentItem";


const generateTitle = (listing:EbayOpenListingEntity):string => {
  return ''
}

const generateDescription = (listing:EbayOpenListingEntity):string => {
  return ''
}

const generateShortContent = (listing:EbayOpenListingEntity):Content => {
  return empty()
}

const generateLongContent = (listing:EbayOpenListingEntity):Content => {
  return empty()
}

const generate = (listing:EbayOpenListingEntity):ContentItem => {
  return {
    title: generateTitle(listing),
    description: generateDescription(listing),
    shortContent: generateShortContent(listing),
    longContent: generateLongContent(listing),
  }
}

export const endedListingContentGenerator = {
  generate,
}