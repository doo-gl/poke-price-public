import {attemptStateUpdater, CardPriceDataImportAttemptEntity, SUB_STATE} from "./CardPriceDataImportAttemptEntity";
import moment from "moment";
import {LoadingState} from "../../constants/LoadingState";
import {momentToTimestamp} from "../../tools/TimeConverter";


const checkForTimeout = (attempt:CardPriceDataImportAttemptEntity, timeoutInMinutes:number):Promise<CardPriceDataImportAttemptEntity> => {
  const timeout = moment(attempt.dateStateStarted.toDate()).add(timeoutInMinutes, "minutes");
  const now = moment();
  const isTimedOut = now.isAfter(timeout);
  if (isTimedOut) {
    return attemptStateUpdater.updateStateAndReturn(
      attempt,
      LoadingState.FAILED,
      SUB_STATE.FAILED.TIMED_OUT,
      {timeout: momentToTimestamp(timeout)},
    )
  }
  return Promise.resolve(attempt);
}

export const cardPriceDataImportTimeoutChecker = {
  checkForTimeout,
}