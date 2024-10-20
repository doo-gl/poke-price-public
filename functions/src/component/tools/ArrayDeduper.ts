import {toInputValueMap} from "./MapBuilder";

export const dedupe = <T> (items:Array<T>, keyMapper:(i:T) => string|number):Array<T> => {
  const map = toInputValueMap(items, keyMapper)
  return [...map.values()]
}

export const dedupeInOrder = <T> (items:Array<T>, keyMapper:(i:T) => string|number):Array<T> => {
  const keys = new Set<string|number>()
  items.forEach(item => {
    const key = keyMapper(item);
    keys.add(key)
  })
  return items.filter(item => {
    const key = keyMapper(item);
    if (!keys.has(key)) {
      return false;
    }
    keys.delete(key)
    return true;
  })
}
