export type Comparator<T> = (obj1:T|undefined|null, obj2:T|undefined|null) => number

const objectAttributeDESC = <T, R>(attributeExtractor:(value:T) => R):Comparator<T> => {
  return (object1:T|undefined|null, object2:T|undefined|null) => {
    if (object1 === undefined || object2 === undefined || object1 === null || object2 === null) {
      return -1; // nulls last
    }
    const attribute1:R = attributeExtractor(object1);
    const attribute2:R = attributeExtractor(object2);
    if (attribute1 > attribute2) {
      return -1;
    }
    if (attribute1 < attribute2) {
      return 1;
    }
    // therefore attribute1 === attribute2
    return 0;
  }
};

const objectAttributeASC = <T, R>(attributeExtractor:(value:T) => R):Comparator<T> => {
  return (object1:T|undefined|null, object2:T|undefined|null) => {
    if (object1 === undefined || object2 === undefined || object1 === null || object2 === null) {
      return -1; // nulls last
    }
    const attribute1:R = attributeExtractor(object1);
    const attribute2:R = attributeExtractor(object2);
    if (attribute1 > attribute2) {
      return 1;
    }
    if (attribute1 < attribute2) {
      return -1;
    }
    // therefore attribute1 === attribute2
    return 0;
  }
};

const combine = <T>(comparator1:Comparator<T>, comparator2:Comparator<T>) => {
  return (object1:T, object2:T) => {
    const result1:number = comparator1(object1, object2);
    return result1 === 0
      ? comparator2(object1, object2)
      : result1;
  }
};

const combineAll = <T>(...comparators:Array<Comparator<T>>):Comparator<T> => {
  return (object1:T|null|undefined, object2:T|null|undefined) => {
    for (let comparatorIndex = 0; comparatorIndex < comparators.length; comparatorIndex++) {
      const comparator = comparators[comparatorIndex];
      const result = comparator(object1, object2);
      if (result !== 0) {
        return result
      }
    }
    return 0;
  }
}

export const comparatorBuilder = {
  combine,
  combineAll,
  objectAttributeASC,
  objectAttributeDESC,
};