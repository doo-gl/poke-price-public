import {JSONSchemaType} from "ajv";
import {PublishRequest} from "./PublishRequest";
import {eventCallback, EventTriggerCallback} from "./EventTriggerBuilder";
import {sendItemWatchEmailTriggerProcessor} from "../domain/watch/SendItemWatchEmailTriggerProcessor";

export interface SendItemWatchEmailRequest {
  itemId:string,
  listingIds:Array<string>
}
export const sendItemWatchEmailSchema:JSONSchemaType<SendItemWatchEmailRequest> = {
  type: "object",
  properties: {
    itemId: { type: "string" },
    listingIds: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
  required: ["itemId", "listingIds"],
}

export const SEND_ITEM_WATCH_EMAIL_TOPIC_NAME = 'send-item-watch-email'
export type SendItemWatchEmailPublishRequest = PublishRequest<'send-item-watch-email', SendItemWatchEmailRequest>

export const SendItemWatchEmailTrigger:EventTriggerCallback = eventCallback(
  async eventPayload => {
    await sendItemWatchEmailTriggerProcessor.process(eventPayload)
  },
  sendItemWatchEmailSchema
)