import {Entity} from "../../database/Entity";
import {Timestamp} from "../../external-lib/Firebase";


export interface UtmDetails {
  source:string|null,
  medium:string|null,
  campaign:string|null,
  term:string|null,
  content:string|null,
}

export interface UserSessionEntity extends Entity {
  mostRecentBeaconReceived:Timestamp,
  userId:string,
  sessionLengthInSeconds:number,
  numberOfBeaconsReceived:number,
  ipAddress:string|null,
  userAgent:string|null,
  origin:string|null,
  startPath?:string|null,
  referrer?:string|null,
  utm?:UtmDetails|null,
  paths?:Array<string>,
  numberOfPaths?:number,
  adId?:string|null,
  fromSessionId?:string|null,
  toSessionId?:string|null,
}