import {InvalidArgumentError} from "../error/InvalidArgumentError";


export const asEnum = <ENUM extends string>(value:string, allowedEnumValues:{[key in ENUM]:string}):ENUM => {
  // @ts-ignore
  if (!allowedEnumValues[value]) {
    throw new InvalidArgumentError(`${value}, is not in the enum: ${Object.keys(allowedEnumValues).join(', ')}`)
  }
  // @ts-ignore
  return value
}