import {csvToJson} from "../../../external-lib/CsvToJson";
import {GenericItemImportRequest} from "./ItemImportRequest";
import {genericItemImporter} from "./GenericItemImporter";
import {SearchTag} from "../../search-tag/SearchTagEntity";
import {InvalidArgumentError} from "../../../error/InvalidArgumentError";
import {ItemEntity} from "../ItemEntity";
import {NotFoundError} from "../../../error/NotFoundError";

const parseSearchTags = (searchTagsRaw:string):Array<SearchTag> => {
  const searchTags:Array<SearchTag> = []
  const splitRawTags = searchTagsRaw.split(',')
  splitRawTags.forEach(rawTag => {
    const splitRawTag = rawTag.split('|')
    if (splitRawTag.length !== 4) {
      throw new InvalidArgumentError(`Raw tag should be 4 items long, in search tag string: ${searchTagsRaw}, ${rawTag}`)
    }
    const key = splitRawTag[0];
    const value = splitRawTag[1];
    const keyLabel = splitRawTag[2];
    const valueLabel = splitRawTag[3];
    searchTags.push({
      key, value, keyLabel, valueLabel, public: true,
    })
  })
  return searchTags
}

const parseSearchKeywords = (rawKeywords:string):Array<string> => {
  let insideOrGroup = false
  let currentKeyword = ''
  const keywords = new Array<string>()
  for (let charIndex = 0; charIndex < rawKeywords.length; charIndex++) {
    const char = rawKeywords.charAt(charIndex)
    if (char === ',' && !insideOrGroup) {
      if (currentKeyword.length > 0) {
        keywords.push(currentKeyword.slice())
      }
      currentKeyword = ''
    } else if (char === '(') {
      currentKeyword = '('
      insideOrGroup = true
    } else if (char === ')') {
      currentKeyword = currentKeyword + ')'
      keywords.push(currentKeyword.slice())
      currentKeyword = ''
      insideOrGroup = false
    } else {
      currentKeyword = currentKeyword + char
    }
  }
  if (currentKeyword.length > 0) {
    keywords.push(currentKeyword)
  }
  return keywords.filter(word => word.length > 0 && word !== ",")
}

const importItemsFromCsv = async (csv:string):Promise<Array<ItemEntity>> => {
  const requests:Array<GenericItemImportRequest> = []
  let rows:any[] = []
  await csvToJson.csv()
    .fromString(csv)
    .then(res => {
      rows = res
    })
  rows.forEach(row => {
    const name = row['Name']
    const imageUrl = row['ImageUrl']
    const searchTagsRaw = row['SearchTags']
    const includesRaw = row['Includes']
    const excludesRaw = row['Excludes']
    const itemId = row['ItemId']

    if (!name) {
      throw new NotFoundError("Missing Row: 'Name'")
    }
    if (!imageUrl) {
      throw new NotFoundError("Missing Row: 'ImageUrl'")
    }
    if (!searchTagsRaw) {
      throw new NotFoundError("Missing Row: 'SearchTags'")
    }
    if (!includesRaw) {
      throw new NotFoundError("Missing Row: 'Includes'")
    }
    if (!excludesRaw) {
      throw new NotFoundError("Missing Row: 'Excludes'")
    }

    const searchTags = parseSearchTags(searchTagsRaw);
    const includes = parseSearchKeywords(includesRaw)
    const excludes = parseSearchKeywords(excludesRaw)

    requests.push({
      itemId: itemId && itemId.length === 0 ? null : itemId ?? null,
      name,
      description: null,
      searchTags,
      imageUrls: [imageUrl],
      searchIncludes: includes,
      searchExcludes: excludes,
      itemType: "generic",
      identifiers: {},
    })
  })
  return await genericItemImporter.importItems(requests)
}

export const csvGenericItemImporter = {
  importItemsFromCsv,
}