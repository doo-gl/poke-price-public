


export const flattenArray = <T>(arrayOfArrays:Array<Array<T>>):Array<T> => {
  if (!arrayOfArrays || arrayOfArrays.length === 0) {
    return [];
  }
  const result:Array<T> = [];
  arrayOfArrays.forEach(array => {
    if (!array || array.length === 0) {
      return;
    }
    array.forEach(item => {
      result.push(item);
    })
  });
  return result;
};