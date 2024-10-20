import {eventCallback, EventTriggerCallback} from "./EventTriggerBuilderV2";
import {JSONSchemaType} from "ajv";
import {logger} from "firebase-functions";

export const debugSchema:JSONSchemaType<{data:object}> = {
  type: "object",
  properties: {
    data: { type: "object", required: [], additionalProperties: true },
  },
  additionalProperties: false,
  required: ["data"],
}

export const DebugTrigger:EventTriggerCallback = eventCallback(
  async eventPayload => {
    logger.info(`Debug Trigger: ${JSON.stringify(eventPayload, null, 2)}`)
  },
  debugSchema
)