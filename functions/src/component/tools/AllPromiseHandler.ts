import {logger} from "firebase-functions";

export type HandledPromises<T> = {
  results: Array<T>,
  errors: Array<any>,
}

export const handleAll = <T>(promises:Array<Promise<T>>):Promise<HandledPromises<T>> => {
  const results:Array<T> = [];
  const errors:Array<any> = [];
  if (!promises || promises.length === 0) {
    return Promise.resolve({ results, errors });
  }
  const allPromisesAreFinished = () => results.length + errors.length === promises.length;
  return new Promise(resolve => {
    promises.forEach((promise) => {
      promise
        .then((result) => {
          results.push(result);
        })
        .catch((err) => {
          errors.push(err);
        })
        .then(() => {
          if (allPromisesAreFinished()) {
            resolve({ results, errors });
          }
        })
        .catch(unexpectedError => {
          logger.error('Failed to handle all promises appropriately', unexpectedError);
        })
    });
  });
}

export const handleAllErrors = <T>(
  promises:Array<Promise<T>>,
  errorHandler:((err:any) => void)|string
):Promise<Array<T>> => {
  return handleAll(promises)
    .then(handledPromises => {
      if (handledPromises.errors.length > 0) {
        handledPromises.errors.forEach(err => {
          if (typeof errorHandler === "string") {
            logger.error(errorHandler, err);
          } else {
            errorHandler(err);
          }
        })
      }
      return handledPromises.results;
    })
}