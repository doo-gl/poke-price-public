import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {ADMIN_AUTH} from "../../infrastructure/Authorization";
import {
  CardPriceDataImportAttemptDtoRequest,
  cardPriceDataImportAttemptDtoRetriever,
} from "./CardPriceDataImportAttemptDtoRetriever";
import {nullableEnum, nullableString, nullableTimestamp, readParams} from "../../tools/QueryParamReader";
import {ImportType} from "./CardPriceDataImportAttemptEntity";
import {LoadingState} from "../../constants/LoadingState";


export const GetCardPriceDataImportAttempts:Endpoint = {
  path: '',
  method: Method.GET,
  auth: ADMIN_AUTH,
  requestHandler: async (req) => {
    const request:CardPriceDataImportAttemptDtoRequest = readParams(
      req.query,
      {
        series: nullableString(),
        set: nullableString(),
        cardId: nullableString(),
        importType: nullableEnum<ImportType>(ImportType),
        state: nullableEnum<LoadingState>(LoadingState),
        dateStateStartedFrom: nullableTimestamp(),
        dateStateStartedTo: nullableTimestamp(),
      }
    );
    return cardPriceDataImportAttemptDtoRetriever.retrieve(request);
  },
};