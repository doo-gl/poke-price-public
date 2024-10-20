import {ItemEntity} from "../ItemEntity";
import {csvGenericItemImporter} from "./CsvGenericItemImporter";
import {UnexpectedError} from "../../../error/UnexpectedError";

export enum ItemCsvImportType {
  'GENERIC' = 'GENERIC'
}

export interface ItemBulkCsvImportRequest {
  itemType:ItemCsvImportType,
  csv:string,
}

const importFromCsv = async (request:ItemBulkCsvImportRequest):Promise<Array<ItemEntity>> => {
  if (request.itemType === ItemCsvImportType.GENERIC) {
    return csvGenericItemImporter.importItemsFromCsv(request.csv)
  }
  throw new UnexpectedError(`Unrecognised type: ${request.itemType}`)
}

export const itemBulkCsvImporter = {
  importFromCsv,
}