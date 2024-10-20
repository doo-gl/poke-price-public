import {StatefulEntityDto} from "../EntityDto";
import {ImportData, ImportType} from "./CardPriceDataImportAttemptEntity";


export interface CardPriceDataImportAttemptDto extends StatefulEntityDto {
  importType:ImportType,
  importData:ImportData,
  parentImportId:string|null,
}