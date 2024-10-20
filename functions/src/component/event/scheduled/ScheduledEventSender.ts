import {ScheduledEventEntity, scheduledEventUpdater} from "./ScheduledEventEntity";
import {LoadingState} from "../../constants/LoadingState";
import {logger} from "firebase-functions";
import {timestampToMoment} from "../../tools/TimeConverter";
import moment from "moment/moment";
import {eventPublisher} from "../EventPublisher";

const send = async (initialEvent:ScheduledEventEntity):Promise<void> => {
  let event = initialEvent

  if (event.state === LoadingState.SUCCESSFUL || event.state === LoadingState.FAILED) {
    logger.info(`Scheduled Event: ${event.id} has state: ${event.state}, not sending`)
    await scheduledEventUpdater.updateOnly(event.id, { timestamp: null })
    return;
  }

  if (event.state === LoadingState.IN_PROGRESS) {

    const hasTimedOut = moment().diff(timestampToMoment(event.dateStateStarted), 'minutes') > 5;
    if (!hasTimedOut) {
      logger.info(`Scheduled Event: ${event.id} has state: ${event.state}, not sending`)
      return;
    }
    logger.info(`Scheduled Event: ${event.id} has timed out, retrying.`)
    event = await scheduledEventUpdater.updateStateAndReturn(event, LoadingState.NOT_STARTED, 'RETRYING', {})
  }


  event = await scheduledEventUpdater.updateStateAndReturn(event, LoadingState.IN_PROGRESS, 'SENDING', {})
  try {

    const topicName = event.topicName
    const data = event.data
    const publishedEvent = await eventPublisher.publish({
      topicName,
      data,
    })

    await scheduledEventUpdater.updateState(event, LoadingState.SUCCESSFUL, 'SUCCESSFUL', {
      eventId: publishedEvent.eventId,
    })
    await scheduledEventUpdater.updateOnly(event.id, { timestamp: null })
  } catch (err:any) {
    logger.error(`Failed to send event: ${event.id}, ${err.message}`, err)
    await scheduledEventUpdater.updateState(event, LoadingState.FAILED, 'ERRORED', { error: JSON.parse(JSON.stringify(err)) })
    await scheduledEventUpdater.updateOnly(event.id, { timestamp: null })
  }
}

export const scheduledEventSender = {
  send,
}