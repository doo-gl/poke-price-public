import capitalize from "capitalize";
// Converts a random string to a value that can be used as a key.


export const convertToKey = (value:string) => {

  const transformedValue = value.toLowerCase()
    .replace(/'/gim, '')
    .replace(/&/gim, 'and')
    .replace(/[^a-z0-9é\-]/gim, '-')
    .replace(/-(-)+/gim, '-')
    .replace(/(^-)|(-$)/gim, '')

  return transformedValue;
}

export const convertEnumToKey = (value:string) => {

  const transformedValue = value.toLowerCase()
    .replace(/_/gim, '-')

  return transformedValue;
}

export const capitalizeEnum = (value:string) => {
  return capitaliseKey(convertEnumToKey(value))
}

export const capitaliseKey = (key:string):string => {
  const keyWithSpaces = key.replace(/-/gim, ' ');
  const capitalizedKey = capitalize.words(keyWithSpaces);
  const keyWithReplacements = capitalizedKey
    .replace(/ gx$/gim, ' GX')
    .replace(/ v$/gim, ' V')
    .replace(/ vmax$/gim, ' VMAX')
    .replace(/ and /gim, ' and ')
    .replace(/ of /gim, ' of ')
  return keyWithReplacements;
}