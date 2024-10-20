import {CurrencyAmountLike, fromCurrencyAmountLike} from "../money/CurrencyAmount";
import {CurrencyCode} from "../money/CurrencyCodes";

const AMOUNTS = [
  {amount: 50000, label: "500"},
  {amount: 25000, label: "250"},
  {amount: 10000, label: "100"},
  {amount: 5000, label: "50"},
  {amount: 2500, label: "25"},
  {amount: 1000, label: "10"},
  {amount: 500, label: "5"},
  {amount: 200, label: "2"},
]

const formatValue = (amount:CurrencyAmountLike):string => {
  return fromCurrencyAmountLike(amount).toString()
}

const generateForAmount = (amount:CurrencyAmountLike):Array<{value: string, valueLabel:string}> => {
  const results = new Array<{ value: string, valueLabel: string }>()
  if (
    amount.currencyCode !== CurrencyCode.USD
    && amount.currencyCode !== CurrencyCode.GBP
    && amount.currencyCode !== CurrencyCode.EUR
  ) {
    return results
  }
  AMOUNTS.forEach(val => {
    if (amount.amountInMinorUnits >= val.amount) {
      const formattedValue = formatValue(
        {amountInMinorUnits: val.amount, currencyCode: amount.currencyCode}
      )
      results.push({
        value: `over-${val.label}-${amount.currencyCode.toLowerCase()}`,
        valueLabel: `${formattedValue}+`,
      })
    }
  })

  return results
}

const generate = (amount:CurrencyAmountLike|null):Array<{value: string, valueLabel:string}> => {
  if (!amount) {
    return [];
  }
  return generateForAmount(amount)
}

export const bucketedCurrencyTagGenerator = {
  generate,
}