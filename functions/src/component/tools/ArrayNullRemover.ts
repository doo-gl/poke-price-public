
export const removeNulls = <T>(array:Array<T|null>):Array<T> => {
  return <Array<T>>array.filter(value => value !== null);
}