import {DEFAULT_CONFIG, FunctionConfig} from "../infrastructure/firebase/FirebaseFunctionEndpointBuilder";
import {functions} from "../external-lib/FirebaseFunctions";
import {databaseStatsLogger} from "../infrastructure/express/DatabaseStatsLogger";
import {Message} from "firebase-functions/lib/providers/pubsub";
import {EventContext, logger} from "firebase-functions";
import {jsonValidator} from "../tools/JsonValidator";
import {eventSchema} from "./EventPublisher";
import {JSONSchemaType} from "ajv";


export type EventTriggerCallback = (message:Message, context:EventContext|null) => Promise<void>;

const eventTriggerWrapper = (eventTriggerCallback:EventTriggerCallback):EventTriggerCallback => {
  return (message:Message, context:EventContext|null) => {
    const callback = databaseStatsLogger.wrapper(
      () => eventTriggerCallback(message, context)
    )
    return callback()
  }
}

export class EventTriggerBuilder {

  private _config:FunctionConfig = DEFAULT_CONFIG;

  constructor(
    readonly topicName:string,
    readonly eventTriggerSupplier:() => Promise<EventTriggerCallback>
  ) {
  }

  memory(mem:"128MB"|"256MB"|"512MB"|"1GB"|"2GB"|"4GB") {
    this._config = { ...this._config, memory: mem };
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
        labels: {
          'cloud-function': this._config.name,
        },
      })
      .pubsub.topic(this.topicName)
      .onPublish(async (message, context) => {
        const trigger = await this.eventTriggerSupplier()
        const callback = eventTriggerWrapper(trigger)
        return callback(message, context)
      })
  }

}

export const eventTrigger = (topicName:string, ets:() => Promise<EventTriggerCallback>) => {
  return new EventTriggerBuilder(topicName, ets)
}

export const eventCallback = <T>(callback:(eventPayload:T) => Promise<void>, schema:JSONSchemaType<T>):EventTriggerCallback => {
  return async (message, context) => {
    const messagePayload = message.json;
    if (!messagePayload) {
      logger.error(`Message does not have json payload`)
      return
    }

    try {
      const event = jsonValidator.validate(messagePayload, eventSchema)
      logger.info(`Received event with id: ${event.eventId}, created: ${event.dateCreated}`)

      try {
        const eventPayload = jsonValidator.validate(event.data, schema)
        await callback(eventPayload)
      } catch (err:any) {
        logger.error(`Failed to process event: ${event.eventId}, ${err.message}`, err)
      }

    } catch (err:any) {
      logger.error(`Failed to read message payload: ${err.message}`, err)
    }
  }
}