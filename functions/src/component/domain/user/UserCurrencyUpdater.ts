import {CurrencyCode} from "../money/CurrencyCodes";
import {userRetriever} from "./UserRetriever";
import {userUpdater} from "./UserRepository";
import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {portfolioRefreshOnUserSessionStartedHandler} from "../portfolio/PortfolioRefreshOnUserSessionStartHandler";
import {UserEntity} from "./UserEntity";

export const ALLOWED_CURRENCY_CODES = new Set<CurrencyCode>([
  CurrencyCode.GBP,
  CurrencyCode.USD,
])

const update = async (userId:string, currencyCode:CurrencyCode):Promise<UserEntity> => {
  if (!ALLOWED_CURRENCY_CODES.has(currencyCode)) {
    throw new InvalidArgumentError(`Cannot use ${currencyCode}`)
  }

  const user = await userRetriever.retrieve(userId)
  if (user.preferredCurrency === currencyCode) {
    return user;
  }
  const updatedUser = await userUpdater.updateAndReturn(userId, {preferredCurrency: currencyCode})
  // if user currency has been changed, then make sure that the portfolio has an entry for the new currency
  await portfolioRefreshOnUserSessionStartedHandler.onSessionStarted(updatedUser)
  return updatedUser;
}

export const userCurrencyUpdater = {
  update,
}
