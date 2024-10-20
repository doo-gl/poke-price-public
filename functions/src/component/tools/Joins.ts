
export interface Pair<V1, V2> {
  value1:V1,
  value2:V2,
}

export const leftJoin = <K, V1, V2>(map1:Map<K, V1>, map2:Map<K, V2>):Map<K,Pair<V1, V2|null>> => {
  const result:Map<K, Pair<V1, V2|null>> = new Map<K, Pair<V1, V2|null>>();

  map1.forEach((value1:V1, key:K) => {
    const value2:V2|undefined = map2.get(key);
    const pair:Pair<V1, V2|null> = {
      value1,
      value2: value2 !== undefined ? value2 : null,
    };
    result.set(key, pair);
  })

  return result;
}

export const innerJoin = <K, V1, V2>(map1:Map<K, V1>, map2:Map<K, V2>):Map<K,Pair<V1, V2>> => {
  const result:Map<K, Pair<V1, V2>> = new Map<K, Pair<V1, V2>>();

  map1.forEach((value1:V1, key:K) => {
    const value2:V2|undefined = map2.get(key);
    if (!value2) {
      return;
    }
    const pair:Pair<V1, V2> = {value1, value2};
    result.set(key, pair);
  })

  return result;
}

export const outerJoin = <K, V1, V2>(map1:Map<K, V1>, map2:Map<K, V2>):Map<K,Pair<V1|null, V2|null>> => {
  const result:Map<K, Pair<V1|null, V2|null>> = new Map<K, Pair<V1|null, V2|null>>();

  map1.forEach((value1:V1, key:K) => {
    const value2:V2|undefined = map2.get(key);
    const pair:Pair<V1, V2|null> = {
      value1,
      value2: value2 !== undefined ? value2 : null,
    };
    result.set(key, pair);
  })
  map2.forEach((value2:V2, key:K) => {
    if (result.get(key)) {
      return;
    }
    const value1:V1|undefined = map1.get(key);
    const pair:Pair<V1|null, V2|null> = {
      value1: value1 !== undefined ? value1 : null,
      value2,
    };
    result.set(key, pair);
  })

  return result;
}

export const merge = <K, V>(map1:Map<K, V>, map2:Map<K, V>):Map<K, V> => {
  const result:Map<K, V> = new Map<K, V>(map1.entries());
  map2.forEach((value2:V, key:K) => {
    if (result.get(key)) {
      return
    }
    result.set(key, value2);
  })
  return result;
}