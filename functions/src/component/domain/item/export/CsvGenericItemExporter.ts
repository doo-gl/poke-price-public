import {jsonToCsv} from "../../../external-lib/JsonToCsv";
import {itemRepository} from "../ItemEntity";
import {imageQuerier} from "../ImageQuerier";
import {GENERIC_ITEM_TYPE} from "../../marketplace/item-details/GenericItemDetails";
import {SearchTag} from "../../search-tag/SearchTagEntity";
import {ebayOpenListingUrlCreator} from "../../ebay/card-price/open-listing-retrieval/EbayOpenListingUrlCreator";


const exportAsCsv = async (tags:Array<string>):Promise<string> => {
  const filter = {
    tags: {$all: tags},
  }
  const items = await itemRepository.getMany(filter, {sort: ['_id', 1]})

  const rows = items.map(item => {
    const row:any = {}
    row['ItemId'] = item._id.toString()
    row['Name'] = item.displayName
    row['ImageUrl'] = imageQuerier.getFirst(item.images, {preferenceTags: [['jpeg', 'jpg', 'hi-res'], ['jpg']]})?.url
    const searchTags = item.itemType === GENERIC_ITEM_TYPE ? item.itemDetails.searchTags : []
    row['SearchTags'] = searchTags.map((searchTag:SearchTag) => `${searchTag.key}|${searchTag.value}|${searchTag.keyLabel}|${searchTag.valueLabel}`).join(',')
    const searchKeywords = item.searchKeywords
    const ebayUrl =  ebayOpenListingUrlCreator.createSoldUK({includeKeywords: searchKeywords.includes, excludeKeywords: searchKeywords.excludes})
    row['EbayUrl'] = ebayUrl
    row['Includes'] = searchKeywords.includes.join(',')
    row['Excludes'] = searchKeywords.excludes.join(',')
    return row
  })
  return jsonToCsv.parse(rows);
}

const exportSealedItems = () => {
  return exportAsCsv(['item-type|sealed'])
}

export const csvGenericItemExporter = {
  exportSealedItems,
}