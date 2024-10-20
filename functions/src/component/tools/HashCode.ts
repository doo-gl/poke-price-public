

// see https://github.com/drdrej/hashcode#readme

const hashValueToInt = (value:string|number|boolean):number => {
  const valueString = value.toString()
  let hash = 0;
  for (let i = 0; i < valueString.length; i++) {
    hash = (((hash << 5) - hash) + valueString.charCodeAt(i)) & 0xFFFFFFFF;
  }
  return hash;
}

const hashObjectToInt = (obj:{[key:string]:any}):number => {
  let result = 0;
  for (const property in obj) {
    if (obj.hasOwnProperty(property)) {
      const attr:any = obj[property]
      result += hashValueToInt(property + hashToInt(attr));
    }
  }
  return result;
}

export const hashToInt = (value:any):number => {
  const type = typeof value
  if (type === "string" || type === "boolean" || type === "number") {
    return hashValueToInt(value)
  }
  if (type === "object") {
    return hashObjectToInt(value)
  }
  return 0
}