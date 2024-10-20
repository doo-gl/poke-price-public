import {LoadingState} from "./LoadingState";
import {useEffect, useState} from "react";
import {ExecutedPromise, MultiPromiseExecutor} from "./MultiPromiseExecutor";
import {comparatorBuilder} from "./ComparatorBuilder";


export interface AsyncResult<T> {
  state:LoadingState,
  data:T|null,
  error:any|null,
  id:string
}

interface InternalAsyncResult<T> extends AsyncResult<T> {
  asyncResultSupplier:() => Promise<T>,
  multiPromiseExecutor:MultiPromiseExecutor<T>
}

export const useAsyncResult = <T>(id:string, asyncResultSupplier:() => Promise<T>):AsyncResult<T> => {

  const [asyncResult, setAsyncResult] = useState<InternalAsyncResult<T>>({
    id,
    asyncResultSupplier,
    error: null,
    data: null,
    state: LoadingState.NOT_STARTED,
    multiPromiseExecutor: new MultiPromiseExecutor<T>()
  })

  useEffect(() => {

    const hasNewId = id !== asyncResult.id;
    if (hasNewId) {
      setAsyncResult({
        ...asyncResult,
        id,
        asyncResultSupplier,
        state: LoadingState.NOT_STARTED,
      })
      return;
    }

    if (asyncResult.state !== LoadingState.NOT_STARTED) {
      return;
    }

    setAsyncResult({
      ...asyncResult,
      state: LoadingState.IN_PROGRESS,
    })
    asyncResult.multiPromiseExecutor.execute(id, () => asyncResult.asyncResultSupplier())
      .then(executedPromises => {
        // read through all the requests
        // find the request that started most recently, use that to set the state
        // need to keep track of all the promises that have been kicked off, because they may not finish in the same order they started.
        // for example, a GET request for search with "a", then "ab", then "abc".
        // the promise for "a" might return after the results for "abc",
        // but we are only interested in the most recently started request, not the most recently returning request
        const byStartedAtDesc = comparatorBuilder.objectAttributeDESC<ExecutedPromise<T>, number>(value => value.startedAt.toDate().getTime())
        const sortedPromises = Object.values(executedPromises).sort(byStartedAtDesc);
        if (sortedPromises.length === 0) {
          return;
        }
        const latestPromise = sortedPromises[0];
        const needsUpdate = latestPromise.id === asyncResult.id;
        if (!needsUpdate) {
          return;
        }
        if (latestPromise.error) {
          setAsyncResult({
            ...asyncResult,
            state: LoadingState.FAILED,
            error: latestPromise.error,
            data: null,
          })
        } else {
          setAsyncResult({
            ...asyncResult,
            state: LoadingState.SUCCESSFUL,
            data: latestPromise.data,
            error: null,
          })
        }
      })

    return () => {
      asyncResult.multiPromiseExecutor.removeAllButId(id)
    }
  })

  return {
    id: asyncResult.id,
    state: asyncResult.state,
    data: asyncResult.data,
    error: asyncResult.error,
  }
}