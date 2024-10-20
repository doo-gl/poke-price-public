import isEqual from "lodash.isequal";
import cloneDeep from "lodash.clonedeep";
import sortBy from "lodash.sortby"
import uniq from "lodash.uniq";
import shuffle from "lodash.shuffle";

export const lodash = {
  isEqual,
  isNotEqual: (val1:any, val2:any) => !isEqual(val1, val2),
  cloneDeep,
  sortBy,
  uniq,
  areArraysEqual: (array1:Array<any>, array2:Array<any>) => isEqual(sortBy(array1), sortBy(array2)),
  shuffle,
}