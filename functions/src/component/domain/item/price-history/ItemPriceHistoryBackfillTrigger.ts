import {PublishRequest} from "../../../event/PublishRequest";
import {eventCallback, EventTriggerCallback} from "../../../event/EventTriggerBuilder";
import {JSONSchemaType} from "ajv";
import {priceHistoryBackfiller} from "./PriceHistoryBackfiller";
import {logger} from "firebase-functions";
import {eventPublisher} from "../../../event/EventPublisher";
import {itemRetriever} from "../ItemRetriever";
import {itemPriceHistoryRetriever} from "./ItemPriceHistoryRetriever";

export interface BackfillItemPriceHistoryRequest {
  itemId:string,
}

export const backfillItemPriceHistorySchema:JSONSchemaType<BackfillItemPriceHistoryRequest> = {
  type: "object",
  properties: {
    itemId: { type: "string" },
  },
  additionalProperties: false,
  required: ["itemId"],
}

const request = async (itemIdOrSlug:string):Promise<object> => {
  const item = await itemRetriever.retrieveByIdOrLegacyIdOrSlug(itemIdOrSlug)
  const itemId = item._id.toString()
  const preExistingHistory = await itemPriceHistoryRetriever.retrieveForItem(itemId)
  if (preExistingHistory) {
    // if history already exists, no need to backfill again
    logger.info(`Item: ${itemIdOrSlug} already has history: ${preExistingHistory.id}, not requesting another backfill`)
    return {state: "ALREADY_EXISTS"}
  }

  logger.info(`Requested item price history backfill for item: ${itemId}`)
  const publishRequest:BackfillItemPriceHistoryPublishRequest = {
    topicName: "backfill-item-price-history",
    data: {itemId},
  }
  await eventPublisher.publish(publishRequest)
  return {state: "PUBLISHED"}
}
export const itemPriceHistoryBackfillRequester = {
  request,
}

export type BackfillItemPriceHistoryPublishRequest = PublishRequest<'backfill-item-price-history', BackfillItemPriceHistoryRequest>

export const BackfillItemPriceHistoryTrigger:EventTriggerCallback = eventCallback<BackfillItemPriceHistoryRequest>(
  async eventPayload => {
    await priceHistoryBackfiller.backfill(eventPayload.itemId)
  },
  backfillItemPriceHistorySchema
)