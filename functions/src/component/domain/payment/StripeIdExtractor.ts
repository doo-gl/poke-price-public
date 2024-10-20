

export const extractId = (value:string|{id:string}|null):string|null => {
  return typeof value === 'string'
    ? value
    : value?.id ?? null
}

export const extractNonNullId = (value:string|{id:string}):string => {
  return typeof value === 'string'
    ? value
    : value.id
}