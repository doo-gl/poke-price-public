

// JSON.stringify is deterministic in it's enumeration order of properties: https://stackoverflow.com/questions/42491226/is-json-stringify-deterministic-in-v8

export const STRING_KEY_MAPPER = <I>(input:I) => `${JSON.stringify(input)}`;
export const INPUT_VALUE_MAPPER = <I>(input:I) => input;

export const toMap = <I,K,V>(array:Array<I>, keyMapper:(input:I)=>K, valueMapper:(input:I)=>V):Map<K,V> => {
  const map:Map<K,V> = new Map<K, V>();
  if (!array) {
    return map;
  }
  array.forEach((input:I) => {
    const key:K = keyMapper(input);
    const value:V = valueMapper(input);
    map.set(key, value);
  });
  return map;
}

export const toStringKeyMap = <I,V>(array:Array<I>, valueMapper:(input:I)=>V):Map<string,V> => {
  return toMap<I, string, V>(
    array,
    STRING_KEY_MAPPER,
    valueMapper,
  );
}

export const toStringKeyInputValueMap = <I>(array:Array<I>):Map<string,I> => {
  return toMap(
    array,
    STRING_KEY_MAPPER,
    INPUT_VALUE_MAPPER,
  )
}

export const toInputValueMap = <K,I>(array:Array<I>, keyMapper:(input:I)=>K):Map<K,I> => {
  return toMap<I, K, I>(
    array,
    keyMapper,
    INPUT_VALUE_MAPPER,
  );
}

export const toMultiMap = <I,K,V>(array:Array<I>, keyMapper:(input:I)=>K, valueMapper:(input:I)=>V):Map<K,Array<V>> => {
  const multiMap:Map<K,Array<V>> = new Map<K, Array<V>>();
  if (!array) {
    return multiMap;
  }
  array.forEach((input:I) => {
    const key:K = keyMapper(input);
    const value:V = valueMapper(input);
    let currentMappedValue:Array<V>|undefined = multiMap.get(key);
    if (!currentMappedValue) {
      currentMappedValue = [];
    }
    currentMappedValue.push(value);
    multiMap.set(key, currentMappedValue);
  });
  return multiMap;
}

export const toStringKeyMultiMap = <I,V>(array:Array<I>, valueMapper:(input:I)=>V):Map<string,Array<V>> => {
  return toMultiMap<I, string, V>(
    array,
    STRING_KEY_MAPPER,
    valueMapper,
  );
}

export const toStringKeyInputValueMultiMap = <I>(array:Array<I>):Map<string,Array<I>> => {
  return toMultiMap(
    array,
    STRING_KEY_MAPPER,
    INPUT_VALUE_MAPPER,
  );
}

export const toInputValueMultiMap = <I,K>(array:Array<I>, keyMapper:(input:I)=>K):Map<K,Array<I>> => {
  return toMultiMap(
    array,
    keyMapper,
    INPUT_VALUE_MAPPER,
  )
}
