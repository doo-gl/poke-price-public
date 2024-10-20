import {MembershipPlan} from "../membership/MembershipStatus";
import {EmailType} from "./UserEntity";
import {CurrencyCode} from "../money/CurrencyCodes";
import {UserPercentileDetails} from "../card-ownership/stats/PercentileDetailCalculator";


export interface PublicUserDto {
  userId:string,
  displayName:string,
  username:string|null,
  photoUrl:string|null,
}

export interface CurrentUserDto {
  userId:string,
  email:string,
  displayName:string,
  username:string|null,
  photoUrl:string|null,
  plans:Array<MembershipPlan>,
  unsubscribedEmailTypes:Array<EmailType>
  preferredCurrencyCode:CurrencyCode|null,
}

export interface TokenDto {
  refreshToken:string,
  accessToken:string,
}