import {PublishRequest} from "../PublishRequest";
import {Moment} from "moment";
import {scheduledEventCreator} from "./ScheduledEventEntity";
import {LoadingState} from "../../constants/LoadingState";
import {momentToTimestamp} from "../../tools/TimeConverter";
import {HistoricalState} from "../../database/StatefulEntity";
import {TimestampStatic} from "../../external-lib/Firebase";


const schedule = async <T extends string, D>(request:PublishRequest<T, D>, timestamp:Moment, metadata:any):Promise<void> => {
  const historyItem:HistoricalState = {
    state: LoadingState.NOT_STARTED,
    dateStateStarted: TimestampStatic.now(),
    subState: 'CREATED',
    detail: {
      timestamp: momentToTimestamp(timestamp),
    },
  }
  await scheduledEventCreator.create({
    topicName: request.topicName,
    data: request.data,
    metadata,
    timestamp: momentToTimestamp(timestamp),
    state: historyItem.state,
    dateStateStarted: historyItem.dateStateStarted,
    subState: historyItem.subState,
    history: [historyItem],
  })
}

export const eventScheduler = {
  schedule,
}
