import {JobCallback} from "../../jobs/ScheduledJobCreator";
import {DEFAULT_CONFIG, FunctionConfig} from "./FirebaseFunctionEndpointBuilder";
import {databaseStatsLogger} from "../express/DatabaseStatsLogger";
import {functions} from "../../external-lib/FirebaseFunctions";
import {EUROPE_LONDON} from "../../constants/Timezones";
import {EventContext} from "firebase-functions";

export const jobWrapper = (jobCallback:JobCallback):JobCallback => {
  return (context:EventContext|null) => {
    const callback = databaseStatsLogger.wrapper(
      () => jobCallback(context)
    )
    return callback();
  }
}

export class JobBuilder {

  private _config:FunctionConfig = DEFAULT_CONFIG;

  constructor(
    readonly cron:string,
    readonly jobSupplier:() => Promise<JobCallback>
  ) {
  }

  memory(mem:"128MB"|"256MB"|"512MB"|"1GB"|"2GB"|"4GB") {
    this._config = { ...this._config, memory: mem };
    return this;
  }

  secrets(secrets:Array<string>) {
    this._config = { ...this._config, secrets };
    return this;
  }

  timeout(time:number) {
    this._config = { ...this._config, timeoutSeconds: time };
    return this;
  }

  maxInstances(ins:number) {
    this._config = { ...this._config, maxInstances: ins };
    return this;
  }

  region(reg:string) {
    this._config = { ...this._config, region: reg };
    return this;
  }

  vpcConnector(connector:string) {
    this._config = { ...this._config, vpcConnector: connector };
    return this;
  }

  name(fnName:string) {
    this._config = { ...this._config, name: fnName };
    return this;
  }

  build() {

    return functions
      .region(this._config.region)
      .runWith({
        memory: this._config.memory,
        timeoutSeconds: this._config.timeoutSeconds,
        maxInstances: this._config.maxInstances,
        vpcConnector: this._config.vpcConnector,
        secrets: this._config.secrets,
        labels: {
          'cloud-function': this._config.name,
        },
      })
      .pubsub.schedule(this.cron)
      .timeZone(EUROPE_LONDON)
      .onRun(async context => {
        const job = await this.jobSupplier();
        const callback:JobCallback = jobWrapper(job)
        return callback(context);
      });

  }

}

export const firebaseJobFn = (cron:string, js:() => Promise<JobCallback>) => {
  return new JobBuilder(cron, js)
}