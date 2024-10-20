import {PublishRequest} from "./PublishRequest";

import {eventCallback, EventTriggerCallback} from "./EventTriggerBuilder";
import {JSONSchemaType} from "ajv";
import {publicCardDtoRetrieverV2} from "../domain/card/PublicCardDtoRetrieverV2";

export interface CardByIdRequestedEvent {
  cardIdBatches:Array<Array<string>>
}
export const cardByIdRequestedSchema:JSONSchemaType<CardByIdRequestedEvent> = {
  type: "object",
  properties: {
    cardIdBatches: { type: "array", items: { type: "array", items: { type: "string" } } },
  },
  additionalProperties: false,
  required: ["cardIdBatches"],
}

export const CARD_BY_ID_REQUESTED_TOPIC_NAME = 'card-by-id-requested'
export type CardByIdRequestedPublishRequest = PublishRequest<'card-by-id-requested', CardByIdRequestedEvent>

export const CardByIdRequestedTrigger:EventTriggerCallback = eventCallback(
  async eventPayload => {
    await publicCardDtoRetrieverV2.onCardByIdRequested(eventPayload)
  },
  cardByIdRequestedSchema
)