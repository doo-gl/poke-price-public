import {DEFAULT_CONFIG, FunctionConfig} from "../infrastructure/firebase/FirebaseFunctionV2EndpointBuilder";
import {functionsV2} from "../external-lib/FirebaseFunctions";
import {databaseStatsLogger} from "../infrastructure/express/DatabaseStatsLogger";
import {Message} from "firebase-functions/lib/providers/pubsub";
import {EventContext, logger} from "firebase-functions";
import {jsonValidator} from "../tools/JsonValidator";
import {eventSchema} from "./EventPublisher";
import {JSONSchemaType} from "ajv";
import {MemoryOption, SupportedRegion} from "firebase-functions/lib/v2/options";
import {CloudEvent} from "firebase-functions/lib/v2/core";
import {MessagePublishedData} from "firebase-functions/lib/v2/providers/pubsub";


export type EventTriggerCallback = (event:CloudEvent<MessagePublishedData<any>>) => Promise<void>;

const eventTriggerWrapper = (eventTriggerCallback:EventTriggerCallback):EventTriggerCallback => {
  return (event:CloudEvent<MessagePublishedData<any>>) => {
    const callback = databaseStatsLogger.wrapper(
      () => eventTriggerCallback(event)
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

  memory(mem:MemoryOption) {
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

  region(reg:SupportedRegion) {
    this._config = { ...this._config, region: reg };
    return this;
  }

  vpcConnector(connector:string) {
    this._config = { ...this._config, vpcConnector: connector };
    return this;
  }

  secrets(fnSecrets:Array<string>) {
    this._config = { ...this._config, secrets: fnSecrets };
    return this;
  }

  name(fnName:string) {
    this._config = { ...this._config, name: fnName };
    return this;
  }

  build() {

    return functionsV2
      .pubsub.onMessagePublished(
        {
          topic: this.topicName,
          memory: this._config.memory,
          timeoutSeconds: this._config.timeoutSeconds,
          maxInstances: this._config.maxInstances,
          vpcConnector: this._config.vpcConnector,
          region: this._config.region,
          secrets: this._config.secrets,
          labels: {
            'cloud-function': this._config.name,
          },
        },
        async (event:CloudEvent<MessagePublishedData<any>>) => {
          const trigger = await this.eventTriggerSupplier()
          const callback = eventTriggerWrapper(trigger)
          return callback(event)
        }
      )
  }

}

export const eventTriggerV2 = (topicName:string, ets:() => Promise<EventTriggerCallback>) => {
  return new EventTriggerBuilder(topicName, ets)
}

export const eventCallback = <T>(callback:(eventPayload:T) => Promise<void>, schema:JSONSchemaType<T>):EventTriggerCallback => {
  return async (event:CloudEvent<MessagePublishedData<any>>) => {
    const messagePayload = event.data.message.json;
    if (!messagePayload) {
      logger.error(`Message does not have json payload`)
      return
    }

    try {
      const validatedEvent = jsonValidator.validate(messagePayload, eventSchema)
      logger.info(`Received event with id: ${validatedEvent.eventId}, created: ${validatedEvent.dateCreated}`)

      try {
        const eventPayload = jsonValidator.validate(validatedEvent.data, schema)
        await callback(eventPayload)
      } catch (err:any) {
        logger.error(`Failed to process event: ${validatedEvent.eventId}, ${err.message}`, err)
      }

    } catch (err:any) {
      logger.error(`Failed to read message payload: ${err.message}`, err)
    }
  }
}