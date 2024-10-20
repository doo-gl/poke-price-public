




const execute = <T>(promiseSupplier:(previousResult:T|null) => Promise<T|null>):Promise<Array<T>> => {
  const results:Array<T> = [];
  const handleError = (err:any) => {
    err.results = results;
    throw err;
  };
  const handleResult = (result:T|null):Promise<Array<T>> => {
    if (result === null) {
      return Promise.resolve(results);
    }
    results.push(result);
    const nextPromise = promiseSupplier(result);
    return nextPromise
      .then(handleResult)
      .catch(handleError)
  };
  const initialPromise = promiseSupplier(null);
  if (!initialPromise) {
    return Promise.resolve(results);
  }
  return initialPromise
    .then(handleResult)
    .catch(handleError)
};

export const promiseChainExecutor = {
  execute,
}