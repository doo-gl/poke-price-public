

export const batchArray = <T>(items:Array<T>, batchSize:number):Array<Array<T>> => {

  if (!items || items.length === 0) {
    return []
  }
  let currentBatch:Array<T> = [];
  const batches:Array<Array<T>> = [];
  items.forEach(item => {
    currentBatch.push(item);
    if (currentBatch.length === batchSize) {
      batches.push(currentBatch)
      currentBatch = [];
    }
  });
  if (currentBatch.length > 0) {
    batches.push(currentBatch)
  }
  return batches;
}