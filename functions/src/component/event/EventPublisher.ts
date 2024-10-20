import {appHolder} from "../infrastructure/AppHolder";
import {uuid} from "../external-lib/Uuid";
import moment from "moment/moment";
import {logger} from "firebase-functions";
import {PublishRequest} from "./PublishRequest";
import {JSONSchemaType} from "ajv";

export interface Event {
  data:any,
  eventId:string,
  dateCreated:string,
}
export const eventSchema:JSONSchemaType<Event> = {
  type: "object",
  properties: {
    data: { type: "object", nullable: true },
    eventId: { type: "string" },
    dateCreated: { type: "string" },
  },
  additionalProperties: false,
  required: ["eventId", "dateCreated"],
}

const publish = async <T extends string, D>(request:PublishRequest<T, D>):Promise<Event> => {
  const pubSub = appHolder.getPubSub()
  const topicName = request.topicName
  const event:Event = {
    data: request.data,
    eventId: uuid(),
    dateCreated: moment().toISOString(),
  }
  const dataBuffer = Buffer.from(JSON.stringify(event))

  try {
    logger.info(`Publishing event: ${topicName}:${event.eventId}`)
    const messageId = await pubSub.pubSub().topic(topicName).publish(dataBuffer)
    logger.info(`Published event: ${event.eventId}, google message id: ${messageId}`)
    return event
  } catch (err:any) {
    logger.info(`Failed to publish event: ${event.eventId}, ${err.message}`, err)
    throw err
  }

}

export const eventPublisher = {
  publish,
}