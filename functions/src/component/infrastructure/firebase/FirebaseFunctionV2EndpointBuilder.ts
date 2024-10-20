import {logger} from "firebase-functions";
import {DEFAULT_REGION} from "../../constants/Region";
import {Endpoint} from "../express/Endpoint";
import {Express} from "express";
import {uuid} from "../../external-lib/Uuid";
import {functionsV2} from "../../external-lib/FirebaseFunctions";
import {endpointBuilder} from "../express/EndpointBuilder";
import {CallableRequest} from "firebase-functions/lib/common/providers/https";
import {GlobalOptions, MemoryOption, SupportedRegion} from "firebase-functions/lib/v2/options";

export interface FunctionConfig extends GlobalOptions {
  name:string,
  region:SupportedRegion
}

export const DEFAULT_CONFIG:FunctionConfig = {
  memory: "128MiB",
  timeoutSeconds: 60,
  maxInstances: 10,
  minInstances: 0,
  region: "europe-west1",
  vpcConnector: undefined,
  secrets: [],
  name: 'unnamed',
}

export class EndpointBuilder {

  private _config:FunctionConfig = DEFAULT_CONFIG;

  constructor(readonly endpointSuppler:() => Promise<Array<Endpoint>>) {}

  config(config:FunctionConfig) {
    this._config = { ...config };
    return this;
  }

  secrets(secrets:Array<string>) {
    this._config = { ...this._config, secrets };
    return this;
  }

  memory(mem:MemoryOption) {
    this._config = { ...this._config, memory: mem };
    return this;
  }

  cpu(cpuAmt:number | 'gcf_gen1') {
    this._config = { ...this._config, cpu: cpuAmt };
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

  minInstances(ins:number) {
    this._config = { ...this._config, minInstances: ins };
    return this;
  }

  region(reg:SupportedRegion) {
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

  buildV2() {

    let appInstance:Express|null = null;
    const instanceId:string = uuid();

    return functionsV2.https.onRequest(
      {
        memory: this._config.memory,
        cpu: this._config.cpu,
        timeoutSeconds: this._config.timeoutSeconds,
        maxInstances: this._config.maxInstances,
        minInstances: this._config.minInstances,
        vpcConnector: this._config.vpcConnector,
        secrets: this._config.secrets,
        labels: {
          'cloud-function': this._config.name,
        },
      },
      async (req, resp) => {

          const start = new Date();
          resp.on('finish', () => {
            const finish = new Date();
            logger.info(`${finish.toISOString()} - ${instanceId} - ${req.method} ${req.originalUrl} - ${resp.statusCode} - ${finish.getTime() - start.getTime()}ms`)
          })
          if (appInstance) {
            logger.info(`${start.toISOString()} - ${instanceId} - ${req.method} ${req.originalUrl} - WARM`)
            return appInstance(req, resp)
          }
          logger.info(`${start.toISOString()} - ${instanceId} - ${req.method} ${req.originalUrl} - COLD`)
          const endpoints = await this.endpointSuppler();
          logger.info(`Importing endpoints took ${new Date().getTime() - start.getTime()}ms`)
          const builtApp = endpointBuilder.buildApp(endpoints);
          appInstance = builtApp;
          return appInstance(req, resp)
      })
  }
}

export const firebaseV2ExpressFn = (es:() => Promise<Array<Endpoint>>):EndpointBuilder => {
  return new EndpointBuilder(es);
}