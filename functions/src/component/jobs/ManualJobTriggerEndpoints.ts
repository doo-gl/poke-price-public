// import {Endpoint, Method} from "../infrastructure/express/Endpoint";
// import {BASIC_AUTH} from "../infrastructure/Authorization";
// import {CardPriceDataImportAttemptSourcerJob} from "./CardPriceDataImportAttemptSourcerJob";
// import {JobCallback} from "./ScheduledJobCreator";
// import {TcgPlayerCardPriceDataImportAttemptProcessJob} from "./TcgPlayerCardPriceDataImportAttemptProcessJob";
// import {CardPriceStatsRecalculationJob} from "./CardPriceStatsRecalculationJob";
// import {CacheEntryRemovalJob} from "./CacheEntryRemovalJob";
// import {SetPriceStatsRecalculationJob} from "./SetPriceStatsRecalculationJob";
// import {DuplicateResultCleanUpJob} from "./DuplicateResultCleanUpJob";
// import {EbayOpenListingSourcingJob} from "./EbayOpenListingSourcingJob";
// import {EbayOpenListingCheckingJob} from "./EbayOpenListingCheckingJob";
// import {EbaySearchParamReconcileJob} from "./EbaySearchParamReconcileJob";
// import {HostingFunctionWarmingJob} from "./HostingFunctionWarmingJob";
//
//
// const callJob = async (job:JobCallback):Promise<object> => {
//   await job(null);
//   return Promise.resolve({});
// }
//
// export const CardPriceDataImportAttemptSourcer:Endpoint = {
//   path: '',
//   method: Method.GET,
//   auth: BASIC_AUTH,
//   requestHandler: () => callJob(CardPriceDataImportAttemptSourcerJob),
// }
//
// export const EbayOpenListingSourcingProcessor:Endpoint = {
//   path: '',
//   method: Method.GET,
//   auth: BASIC_AUTH,
//   requestHandler: () => callJob(EbayOpenListingSourcingJob),
// }
//
// export const EbayOpenListingCheckingProcessor:Endpoint = {
//   path: '',
//   method: Method.GET,
//   auth: BASIC_AUTH,
//   requestHandler: () => callJob(EbayOpenListingCheckingJob),
// }
//
// export const EbaySearchParamReconcileJobProcessor:Endpoint = {
//   path: '',
//   method: Method.GET,
//   auth: BASIC_AUTH,
//   requestHandler: () => callJob(EbaySearchParamReconcileJob),
// }
//
// export const TcgPlayerCardPriceDataImportAttemptProcessor:Endpoint = {
//   path: '',
//   method: Method.GET,
//   auth: BASIC_AUTH,
//   requestHandler: () => callJob(TcgPlayerCardPriceDataImportAttemptProcessJob),
// }
//
// export const CardPriceStatsRecalculation:Endpoint = {
//   path: '',
//   method: Method.GET,
//   auth: BASIC_AUTH,
//   requestHandler: () => callJob(CardPriceStatsRecalculationJob),
// }
//
// export const SetPriceStatsRecalculation:Endpoint = {
//   path: '',
//   method: Method.GET,
//   auth: BASIC_AUTH,
//   requestHandler: () => callJob(SetPriceStatsRecalculationJob),
// }
//
// export const CacheEntryRemoval:Endpoint = {
//   path: '',
//   method: Method.GET,
//   auth: BASIC_AUTH,
//   requestHandler: () => callJob(CacheEntryRemovalJob),
// }
//
// export const DuplicateResultCleanUp:Endpoint = {
//   path: '',
//   method: Method.GET,
//   auth: BASIC_AUTH,
//   requestHandler: () => callJob(DuplicateResultCleanUpJob),
// }
//
// export const HostingFunctionWarming:Endpoint = {
//   path: '',
//   method: Method.GET,
//   auth: BASIC_AUTH,
//   requestHandler: () => callJob(HostingFunctionWarmingJob),
// }
//
