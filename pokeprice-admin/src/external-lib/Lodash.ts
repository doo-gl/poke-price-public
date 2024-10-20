import get from 'lodash.get';
import transform from 'lodash.transform';
import isEqual from 'lodash.isequal';
import isObject from 'lodash.isobject';

export const lodash = {
  get,
  transform,
  isEqual,
  isNotEqual: (val1:any, val2:any) => !isEqual(val1, val2),
  isObject,
}