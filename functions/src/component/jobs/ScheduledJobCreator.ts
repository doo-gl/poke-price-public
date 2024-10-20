import {EventContext, RuntimeOptions} from "firebase-functions";
import {DEFAULT_REGION} from "../constants/Region";
import {EUROPE_LONDON} from "../constants/Timezones";
import {functions} from "../external-lib/FirebaseFunctions";
import {DEFAULT_CONFIG} from "../infrastructure/firebase/FirebaseFunctionEndpointBuilder";
import {jobWrapper} from "../infrastructure/firebase/FirebaseFunctionJobBuilder";

export type JobCallback = (context:EventContext|null) => Promise<void>;
export interface ScheduledJob {
  cronExpression:string, // use this syntax where possible: https://cloud.google.com/appengine/docs/standard/python/config/cronref#schedule_format
  callback:JobCallback,
  runtimeOptions?:RuntimeOptions,
}

const create = (job:ScheduledJob) => {
  const runtimeOptions:RuntimeOptions = job.runtimeOptions || DEFAULT_CONFIG;

  const onRun:JobCallback = (context) => {
    const callback:JobCallback = jobWrapper(job.callback)
    return callback(context)
  }

  return functions
    .region(DEFAULT_REGION)
    .runWith(runtimeOptions)
    .pubsub.schedule(job.cronExpression)
    .timeZone(EUROPE_LONDON)
    .onRun(onRun);
}

export const scheduledJobCreator = {
  create,
}