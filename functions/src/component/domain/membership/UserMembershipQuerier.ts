import {UserEntity} from "../user/UserEntity";
import {MembershipPlan} from "./MembershipStatus";


const isPokePriceProUser = (user:UserEntity):boolean => {
  return !!user.membership
    && user.membership.plans.some(plan => plan === MembershipPlan.POKE_PRICE_PRO)
}

export const userMembershipQuerier = {
  isPokePriceProUser,
}