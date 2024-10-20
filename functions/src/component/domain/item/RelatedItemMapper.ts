import {ItemEntity, legacyIdOrFallback, RelatedItem} from "./ItemEntity";


const map = (item:ItemEntity):RelatedItem => {
  return {
    id: legacyIdOrFallback(item),
    name: item.displayName,
    longName: item.displayName,
    slug: item.slug || legacyIdOrFallback(item),
    image: item.images,
  }
}

export const relatedItemMapper = {
  map,
}