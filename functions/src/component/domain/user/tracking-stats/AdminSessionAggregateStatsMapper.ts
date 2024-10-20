import {EntityDto} from "../../EntityDto";
import {SessionAggregateStatsEntity} from "./SessionAggregateStatsEntity";
import moment from "moment";

export interface AdminSessionAggregateStatsDto extends EntityDto, Omit<SessionAggregateStatsEntity, keyof EntityDto|"_id"> {
  _id:string
}

const map = (stats:SessionAggregateStatsEntity):AdminSessionAggregateStatsDto => {
  const {
    _id,
    dateCreated,
    dateLastModified,
    ...dto
  } = stats
  return {
    ...dto,
    id: stats._id.toString(),
    _id: stats._id.toString(),
    dateCreated: moment(dateCreated),
    dateLastModified: moment(dateLastModified),
  }
}

export const adminSessionAggregateStatsMapper = {
  map,
}