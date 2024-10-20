import {CardPriceDataImportAttemptEntity} from "./CardPriceDataImportAttemptEntity";
import {CardPriceDataImportAttemptDto} from "./CardPriceDataImportAttemptDto";
import {StatefulEntityDto} from "../EntityDto";
import {statefulEntityDtoMapper} from "../StatefulEntityDtoMapper";


const map = (attempt:CardPriceDataImportAttemptEntity):CardPriceDataImportAttemptDto => {
  const statefulEntity:StatefulEntityDto = statefulEntityDtoMapper.map(attempt);
  return {
    ...statefulEntity,
    importType: attempt.importType,
    importData: attempt.importData,
    parentImportId: attempt.parentImportId,
  }
}

export const cardPriceDataImportAttemptDtoMapper = {
  map,
}