import {EventTriggerCallback} from "../event/EventTriggerBuilder";
import {logger} from "firebase-functions";


export const DebugEventTrigger:EventTriggerCallback = async (message, context) => {
  logger.info(`Debug trigger started`)
  logger.info(message)
  logger.info(message.json)
  logger.info(message.toJSON())
  logger.info(`Debug trigger finished`)
}