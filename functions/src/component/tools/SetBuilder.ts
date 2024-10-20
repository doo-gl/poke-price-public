


export const toSet = <I,K>(array:Array<I>, keyMapper:(input:I)=>K):Set<K> => {
  const set = new Set<K>();
  if (!array) {
    return set;
  }
  array.forEach(input => {
    const key = keyMapper(input);
    set.add(key);
  });
  return set;
}

export const toInputValueSet = <I>(array:Array<I>):Set<I> => {
  return toSet(array, value => value);
}