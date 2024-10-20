import {Entity} from "../../database/Entity";
import {repositoryFactory} from "../../database/RepositoryFactory";
import {JSONSchemaType} from "ajv";
import {Timestamp} from "../../external-lib/Firebase";

const COLLECTION_NAME = 'item-watch-notification-history'

export interface ItemWatchNotificationHistoryEntity extends Entity {
  itemWatchId:string,
  itemId:string,
  userId:string,
  timestamp:Timestamp,
  notificationType:'EMAIL',
  notificationDetails:any,
}

export interface EmailWatchNotificationDetails {
  emailAttemptId:string,
  emailType:'NEW_LISTINGS',
  newListingIds:Array<string>,
}
export const emailWatchNotificationDetailSchema:JSONSchemaType<EmailWatchNotificationDetails> = {
  type: "object",
  properties: {
    emailAttemptId: { type: "string" },
    emailType: { type: "string", const: 'NEW_LISTINGS' },
    newListingIds: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
  required: ["emailAttemptId", "emailType", "newListingIds"],
}

const result = repositoryFactory.build<ItemWatchNotificationHistoryEntity>(COLLECTION_NAME);
export const itemWatchNotificationHistoryRepository = result.repository;
export const itemWatchNotificationHistoryCreator = result.creator;
export const itemWatchNotificationHistoryUpdater = result.updater;
export const itemWatchNotificationHistoryDeleter = result.deleter;