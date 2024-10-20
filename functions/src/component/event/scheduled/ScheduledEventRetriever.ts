import {ScheduledEventEntity, scheduledEventRepository} from "./ScheduledEventEntity";
import {SortOrder} from "../../database/BaseCrudRepository";
import {momentToTimestamp} from "../../tools/TimeConverter";
import moment from "moment/moment";


const retrieveByTimestampAsc = (limit:number):Promise<Array<ScheduledEventEntity>> => {
  return scheduledEventRepository.getMany(
    [
      { field: "timestamp", operation: "!=", value: null },
    ],
    {
      limit,
      sort: [{ field: "timestamp", order: SortOrder.ASC }],
    }
  )
}

const retrieveNextScheduledForUserIdInTopic = async (userId:string, topicName:string):Promise<ScheduledEventEntity|null> => {
  const events = await scheduledEventRepository.getMany(
    [
      { field: 'topicName', operation: "==", value: topicName },
      { field: 'data.userId', operation: "==", value: userId },
      { field: 'timestamp', operation: ">", value: momentToTimestamp(moment()) },
    ],
    {
      limit: 1,
      sort: [ { field: 'timestamp', order: SortOrder.ASC } ],
    }
  )
  if (events.length === 0) {
    return null
  }
  return events[0]
}

export const scheduledEventRetriever = {
  retrieveByTimestampAsc,
  retrieveNextScheduledForUserIdInTopic,
}