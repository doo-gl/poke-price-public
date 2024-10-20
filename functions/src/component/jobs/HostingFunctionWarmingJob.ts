import {JobCallback} from "./ScheduledJobCreator";
import {EventContext, logger} from "firebase-functions";
import {hostingFunctionWarmer} from "../domain/webapp/warming/HostingFunctionWarmerV2";


export const HostingFunctionWarmingJob:JobCallback = async (context:EventContext|null) => {
  logger.info("Starting hosting function warming job");
  await hostingFunctionWarmer.warm()
  logger.info("Finished hosting function warming job")
  return Promise.resolve();
}