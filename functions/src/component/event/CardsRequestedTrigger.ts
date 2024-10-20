import {PublishRequest} from "./PublishRequest";

import {eventCallback, EventTriggerCallback} from "./EventTriggerBuilder";
import {JSONSchemaType} from "ajv";
import {CardRequest, cardRequestSchema, publicCardDtoRetrieverV2} from "../domain/card/PublicCardDtoRetrieverV2";

export interface CardsRequestedEvent {
  request:CardRequest
}
export const cardsRequestedSchema:JSONSchemaType<CardsRequestedEvent> = {
  type: "object",
  properties: {
    request: cardRequestSchema,
  },
  additionalProperties: false,
  required: ["request"],
}

export const CARDS_REQUESTED_TOPIC_NAME = 'cards-requested'
export type CardsRequestedPublishRequest = PublishRequest<'cards-requested', CardsRequestedEvent>

export const CardsRequestedTrigger:EventTriggerCallback = eventCallback(
  async eventPayload => {
    await publicCardDtoRetrieverV2.onCardsRequested(eventPayload.request)
  },
  cardsRequestedSchema
)