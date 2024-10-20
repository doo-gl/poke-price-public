/**
 * Returns a set that has all the elements of set1 that are not contained in set2
 *
 * EG. difference((1,2,3), (1,3)) = (2)
 *
 * @param set1
 * @param set2
 */
export const difference = <T>(set1:Set<T>, set2:Set<T>):Set<T> => {
  return new Set([...set1].filter(x => !set2.has(x)));
}

/**
 * Returns a set that has all the elements that are in both set1 and set2
 *
 * EG. intersection((1,2,3), (1,3)) = (1,3)
 *
 * @param set1
 * @param set2
 */
export const intersection = <T>(set1:Set<T>, set2:Set<T>):Set<T> => {
  return new Set([...set1].filter(x => set2.has(x)));
}

/**
 * Returns a set that has all the elements that are in set1 and set2
 *
 * EG. union((1,2,3), (1,3,4)) = (1,2,3,4)
 *
 * @param set1
 * @param set2
 */
export const union = <T>(set1:Set<T>, set2:Set<T>):Set<T> => {
  return new Set([...set1].concat(...set2));
}

