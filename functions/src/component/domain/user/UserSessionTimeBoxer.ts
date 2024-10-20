import {UserEntity} from "./UserEntity";
import {UserSessionEntity} from "./UserSessionEntity";
import {timestampToMoment} from "../../tools/TimeConverter";
import {toInputValueMultiMap} from "../../tools/MapBuilder";
import {userRetriever} from "./UserRetriever";
import {userSessionRetriever} from "./UserSessionRetriever";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";
import moment, {Moment} from "moment";

const BY_WEIGHT_DESC_DAY_HOUR_ASC = comparatorBuilder.combineAll<WeightedTimeBox>(
  comparatorBuilder.objectAttributeDESC(value => value.weight),
  comparatorBuilder.objectAttributeASC(value => value.dayOfWeek),
  comparatorBuilder.objectAttributeASC(value => value.hourOfDay),
)

export interface TimeBox {
  dayOfWeek:number, // 0 to 6, 0 is Sunday, 6 is Saturday
  hourOfDay:number, // 0 to 23
}

export interface WeightedTimeBox extends TimeBox {
  weight:number
}

export interface PopularUserSessionTimeBoxes {
  userId:string,
  timeBoxes:Array<WeightedTimeBox>

}

const timeBoxForUser = (user:UserEntity, sessions:Array<UserSessionEntity>):PopularUserSessionTimeBoxes => {
  if (sessions.length === 0) {
    return {
      userId: user.id,
      timeBoxes: [],
    }
  }
  const timeBoxes:Array<TimeBox> = sessions.map(session => {
    const startOfSession = timestampToMoment(session.dateCreated)
    const dayOfWeek = startOfSession.day()
    const hourOfDay = startOfSession.hour()
    return { dayOfWeek, hourOfDay }
  })
  const timeBoxesGroupedByHourAndDay = toInputValueMultiMap(timeBoxes, box => `${box.dayOfWeek}|${box.hourOfDay}`)
  const timeBoxesGroupedByDay = toInputValueMultiMap(timeBoxes, box => `${box.dayOfWeek}`)
  const timeBoxesGroupedByHour = toInputValueMultiMap(timeBoxes, box => `${box.hourOfDay}`)

  const weightedTimeBoxes:Array<WeightedTimeBox> = [...timeBoxesGroupedByHourAndDay.entries()].map(entry => {
    const key = entry[0]
    const timeBoxesForDayAndHour = entry[1]
    const dayOfWeek = Number.parseInt(key.split('|')[0])
    const hourOfDay = Number.parseInt(key.split('|')[1])

    const timeBoxesOnDay = timeBoxesGroupedByDay.get(dayOfWeek.toString()) ?? []
    const timeBoxesOnHour = timeBoxesGroupedByHour.get(hourOfDay.toString()) ?? []
    const timeBoxesOneHourEarlier = hourOfDay - 1 >= 0
      ? timeBoxesGroupedByHourAndDay.get(`${dayOfWeek}|${hourOfDay - 1}`) ?? []
      : []
    const timeBoxesOneHourLater = hourOfDay + 1 <= 23
      ? timeBoxesGroupedByHourAndDay.get(`${dayOfWeek}|${hourOfDay + 1}`) ?? []
      : []
    const score = (4 * timeBoxesForDayAndHour.length)
      + (timeBoxesOnDay.length) + (timeBoxesOnHour.length)
      + (timeBoxesOneHourEarlier.length) + (timeBoxesOneHourLater.length)
    return {
      weight: score,
      dayOfWeek,
      hourOfDay,
    }
  })

  const totalScore = weightedTimeBoxes
    .map(box => box.weight)
    .reduce((l:number,r:number) => l + r, 0)

  const normalisedWeightedTimeBoxes:Array<WeightedTimeBox> = weightedTimeBoxes
    .map(box => ({
      dayOfWeek: box.dayOfWeek,
      hourOfDay: box.hourOfDay,
      weight: (box.weight / totalScore) * 100,
    }))
    .sort(BY_WEIGHT_DESC_DAY_HOUR_ASC)
  return {
    userId: user.id,
    timeBoxes: normalisedWeightedTimeBoxes,
  }
}

const timeBoxForUserId = async (userId:string):Promise<PopularUserSessionTimeBoxes> => {
  const user = await userRetriever.retrieve(userId)
  const sessions = await userSessionRetriever.retrieveByUserId(userId)
  return timeBoxForUser(user, sessions)
}

const findNextAvailableTime = (time:Moment, timeBoxes:Array<WeightedTimeBox>):Moment => {

  let nextAvailableTime:Moment|null = null
  timeBoxes.forEach(timeBox => {

    let timeInTimeBox = time.clone()
      .day(timeBox.dayOfWeek)
      .hour(timeBox.hourOfDay)
    if (timeInTimeBox.isBefore(time)) {
      timeInTimeBox = timeInTimeBox.clone().add(7, 'days')
    }

    if (!nextAvailableTime) {
      nextAvailableTime = timeInTimeBox
      return
    }

    const newTimeDifferenceMillis = timeInTimeBox.diff(time, 'milliseconds')
    const currentTimeDifferenceMillis = nextAvailableTime.diff(time, 'milliseconds')
    if (newTimeDifferenceMillis < currentTimeDifferenceMillis) {
      nextAvailableTime = timeInTimeBox
    }

  })

  return nextAvailableTime ?? time.clone()
}

export const userSessionTimeBoxer = {
  timeBoxForUser,
  timeBoxForUserId,
  findNextAvailableTime,
}