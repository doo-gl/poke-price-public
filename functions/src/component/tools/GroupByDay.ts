import {comparatorBuilder} from "../infrastructure/ComparatorBuilder";
import {Moment} from "moment";


export const groupByDay = <T>(values:Array<T>, timestampMapper:(val:T) => Moment) => {
  const dateToVal = new Map<string, T>()
  values.forEach(val => {
    const valTimestamp = timestampMapper(val)
    const date = valTimestamp.startOf("day").toISOString()
    let valForThisDate:T|null = dateToVal.get(date) ?? null
    const isNewer = !valForThisDate
      || valTimestamp.isAfter(timestampMapper(valForThisDate))
    if (isNewer) {
      valForThisDate = val
    }
    if (valForThisDate) {
      dateToVal.set(date, valForThisDate)
    }
  })
  const sortedValues = [...dateToVal.values()]
    .sort(comparatorBuilder.combineAll(
      comparatorBuilder.objectAttributeASC(val => timestampMapper(val).toDate().getTime()),
    ))
  return sortedValues
}