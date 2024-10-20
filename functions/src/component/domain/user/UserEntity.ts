import {Entity} from "../../database/Entity";
import {MembershipPlan} from "../membership/MembershipStatus";
import {WeightedTimeBox} from "./UserSessionTimeBoxer";
import {Timestamp} from "../../external-lib/Firebase";
import {CurrencyCode} from "../money/CurrencyCodes";
import {UserPercentileDetails} from "../card-ownership/stats/PercentileDetailCalculator";

export interface Terms {
  acceptedTerms:boolean,
  acceptedMarketing:boolean,
}

export interface UserDetails {
  email:string,
  displayName:string, // the real person's name as pulled from Social media - falls back to email prefix
  photoUrl:string|null,
  username?:string, // the public username for the user, that they have chosen
}

export interface MembershipDetails {
  plans:Array<MembershipPlan>,
}

export interface StripeDetails {
  stripeId:string,
  stripeLink:string,
}

export interface UserTimeBoxes {
  timeBoxes:Array<WeightedTimeBox>,
  lastUpdated:Timestamp,
}

export enum EmailType {
  PORTFOLIO_UPDATE = 'PORTFOLIO_UPDATE',
}

export interface EmailPreferences {
  unsubscribedEmailTypes:Array<EmailType>,
}

export const extractUserCurrencyCode = (user:UserEntity):CurrencyCode => {
  return user.preferredCurrency ?? CurrencyCode.GBP
}

export interface UserEntity extends Entity {
  mostRecentSessionId:string|null,
  parentUserId:string|null,
  firebaseUserIds:Array<string>|null,
  facebookUserId:string|null,
  details:UserDetails|null,
  terms:Terms|null,
  stripeDetails:StripeDetails|null,
  membership:MembershipDetails|null,
  preferredCurrency?:CurrencyCode
  userTimeBoxes?:UserTimeBoxes,
  emailPreferences?:EmailPreferences,
  nextReactivationAttempt?:Timestamp|null,
  percentileDetails?:UserPercentileDetails|null,
}