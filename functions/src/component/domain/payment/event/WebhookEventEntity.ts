import {Entity} from "../../../database/Entity";
import {repositoryFactory} from "../../../database/RepositoryFactory";
import {Timestamp} from "../../../external-lib/Firebase";


export interface WebhookEventEntity extends Entity {
  event:any,
  eventId:string,
  timestamp:Timestamp,
  eventObjectId:string|null,
  type:string,
}

const COLLECTION_NAME = 'stripe-webhook-event'

const result = repositoryFactory.build<WebhookEventEntity>(COLLECTION_NAME);

export const webhookEventRepository = result.repository;
export const baseWebhookEventCreator = result.creator;
export const baseWebhookEventUpdater = result.updater;
export const baseWebhookEventDeleter = result.deleter;