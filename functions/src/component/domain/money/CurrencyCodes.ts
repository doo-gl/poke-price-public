

// using ISO codes: https://en.wikipedia.org/wiki/ISO_4217
export enum CurrencyCode {
  GBP = 'GBP',
  USD = 'USD',
  AUD = 'AUD',
  CAD = 'CAD',
  EUR = 'EUR',
  CHF = 'CHF',
}

export const isCurrencyCode = (value:string):boolean => {
  return (<any>Object).values(CurrencyCode).includes(value)
}