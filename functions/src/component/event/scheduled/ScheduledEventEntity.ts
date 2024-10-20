import {StatefulEntity} from "../../database/StatefulEntity";
import {repositoryFactory} from "../../database/RepositoryFactory";
import {StatefulEntityUpdater} from "../../database/StatefulEntityUpdater";
import {Timestamp} from "../../external-lib/Firebase";


const COLLECTION_NAME = 'scheduled-event'

export interface ScheduledEventEntity extends StatefulEntity {

  topicName:string,
  data:any,
  timestamp:Timestamp|null
  metadata:any,

}

const result = repositoryFactory.build<ScheduledEventEntity>(COLLECTION_NAME);
export const scheduledEventRepository = result.repository;
export const scheduledEventCreator = result.creator;
export const scheduledEventUpdater = new StatefulEntityUpdater(result.repository)
export const scheduledEventDeleter = result.deleter;