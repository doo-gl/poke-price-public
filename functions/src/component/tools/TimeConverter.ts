import moment, {Moment} from "moment";
import {Timestamp, TimestampStatic} from "../external-lib/Firebase";


export const momentToTimestamp = (momentInput:Moment):Timestamp => {
  return TimestampStatic.fromDate(momentInput.toDate());
};

export const timestampToMoment = (timestamp:Timestamp):Moment => {
  return moment(timestamp.toDate()).utc();
}

export const stringToMoment = (value:string):Moment => {
  return moment(value, moment.ISO_8601, true).utc()
}

export const stringToTimestamp = (value:string):Timestamp => {
  return momentToTimestamp(stringToMoment(value))
}

export const momentToString = (value:Moment):string => {
  return value.toISOString()
}

export const timestampToString = (value:Timestamp):string => {
  return momentToString(timestampToMoment(value))
}