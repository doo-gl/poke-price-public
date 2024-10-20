

export const convertToKey = (value:string) => {

  const transformedValue = value.toLowerCase()
    .replace(/'/gim, '')
    .replace(/&/gim, 'and')
    .replace(/[^a-z0-9é\-]/gim, '-')
    .replace(/-(-)+/gim, '-')
    .replace(/(^-)|(-$)/gim, '')

  return transformedValue;
}

export const convertToSlug = (value:string) => {

  const transformedValue = value.toLowerCase()
    .replace(/'/gim, '')
    .replace(/&/gim, 'and')
    .replace(/[^a-z0-9é\-]/gim, '-')
    .replace(/--(-)+/gim, '--')
    .replace(/(^-)|(-$)/gim, '')

  return transformedValue;
}