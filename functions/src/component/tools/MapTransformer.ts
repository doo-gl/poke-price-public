
export interface Entry<K, V> {
  key:K,
  value:V,
}

export const mapToArray = <K,V>(map:Map<K,V>):Array<Entry<K, V>> => {
  const results:Array<Entry<K, V>> = [];

  map.forEach(((value, key) => {
    results.push({ key, value })
  }))

  return results;
}