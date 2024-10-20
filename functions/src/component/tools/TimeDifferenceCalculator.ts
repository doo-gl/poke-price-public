import moment from "moment";
import {Moment} from "moment/moment";

export enum TimeUnit {
  SECOND = 'SECOND',
  MINUTE = 'MINUTE',
  HOUR = 'HOUR',
  DAY = 'DAY',
}

export interface DiffRequest {
  from:Moment,
  to:Moment,
  units:Array<TimeUnit>,
  shortLabels?:boolean,
}

const calculate = (request:DiffRequest):string => {
  let message = '';
  const units = request.units
  const duration = moment.duration(request.to.diff(request.from))

  if (units.some(unit => unit === TimeUnit.SECOND)) {
    const diff = duration.seconds()
    const prependMessage = request.shortLabels
      ? `${diff}s `
      : `${diff} ${diff === 1 ? 'second' : 'seconds'} `
    message = prependMessage + message
    if (duration.seconds() === Math.floor(duration.asSeconds())) {
      return message
    }
  }
  if (units.some(unit => unit === TimeUnit.MINUTE)) {
    const diff = duration.minutes()
    const prependMessage = request.shortLabels
      ? `${diff}m `
      : `${diff} ${diff === 1 ? 'minute' : 'minutes'} `
    message = prependMessage + message
    if (duration.minutes() === Math.floor(duration.asMinutes())) {
      return message
    }
  }
  if (units.some(unit => unit === TimeUnit.HOUR)) {
    const diff = duration.hours()
    const prependMessage = request.shortLabels
      ? `${diff}h `
      : `${diff} ${diff === 1 ? 'hour' : 'hours'} `
    message = prependMessage + message
    if (duration.hours() === Math.floor(duration.asHours())) {
      return message
    }
  }
  if (units.some(unit => unit === TimeUnit.DAY)) {
    const diff = duration.days()
    const prependMessage = request.shortLabels
      ? `${diff}d `
      : `${diff} ${diff === 1 ? 'day' : 'days'} `
    message = prependMessage + message
    if (duration.days() === Math.floor(duration.asDays())) {
      return message
    }
  }

  return message;
}

export const timeDifferenceCalculator = {
  calculate,
}