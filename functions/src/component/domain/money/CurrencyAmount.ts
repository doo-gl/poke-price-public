import {CurrencyCode} from "./CurrencyCodes";
import Dinero from "dinero.js";
import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {UnexpectedError} from "../../error/UnexpectedError";
import {JSONSchemaType} from "ajv";

/*
 * Currency is specified in minor units.
 * A minor unit is the smallest unit of currency.
 * For example, in GBP, the major unit is pounds, the minor is pence, a minor unit would be a penny.
 * In Yen there are no major / minor units, it's all Yen, so the minor unit is a Yen.
 * Internally, the calculations are handled by Dinero,
 * but this class exists as a layer that allows that implementation to be changed in future
 */

export const Zero = (currencyCode:CurrencyCode):CurrencyAmount => new CurrencyAmount(0, currencyCode);
export const Min = (currencyCode:CurrencyCode):CurrencyAmount => new CurrencyAmount(Number.MIN_SAFE_INTEGER, currencyCode);
export const Max = (currencyCode:CurrencyCode):CurrencyAmount => new CurrencyAmount(Number.MAX_SAFE_INTEGER, currencyCode);

export interface CurrencyAmountLike {
  amountInMinorUnits:number,
  currencyCode:CurrencyCode,
}
export const currencyAmountSchema:JSONSchemaType<CurrencyAmountLike> = {
  type: "object",
  properties: {
    amountInMinorUnits: { type: "number" },
    currencyCode: { type: "string", anyOf: Object.keys(CurrencyCode).map(variant => ({ const: variant })) },
  },
  additionalProperties: false,
  required: ["amountInMinorUnits", "currencyCode"],
}

export const fromCurrencyAmountLike = (currencyAmountLike:CurrencyAmountLike):CurrencyAmount => {
  return new CurrencyAmount(currencyAmountLike.amountInMinorUnits, currencyAmountLike.currencyCode);
}

export const fromOptionalCurrencyAmountLike = (currencyAmountLike:CurrencyAmountLike|null):CurrencyAmount|null => {
  if (!currencyAmountLike) {
    return null
  }
  return new CurrencyAmount(currencyAmountLike.amountInMinorUnits, currencyAmountLike.currencyCode);
}

export class CurrencyAmount implements CurrencyAmountLike {

  amountInMinorUnits:number

  constructor(
    amountInMinorUnits:number,
    readonly currencyCode:CurrencyCode,
  ) {
    this.amountInMinorUnits = Math.round(amountInMinorUnits)
  }

  add(that:CurrencyAmount):CurrencyAmount {
    validateCurrencyCodes(this, that);
    const thisDinero:Dinero.Dinero = toDinero(this);
    const thatDinero:Dinero.Dinero = toDinero(that);
    const resultDinero:Dinero.Dinero = thisDinero.add(thatDinero);
    const result = toCurrencyAmount(resultDinero);
    validateSafeMax(result);
    return result;
  }

  subtract(that:CurrencyAmount):CurrencyAmount {
    validateCurrencyCodes(this, that);
    const thisDinero:Dinero.Dinero = toDinero(this);
    const thatDinero:Dinero.Dinero = toDinero(that);
    const resultDinero:Dinero.Dinero = thisDinero.subtract(thatDinero);
    const result = toCurrencyAmount(resultDinero);
    validateSafeMax(result);
    return result;
  }

  divide(divisor:number):CurrencyAmount {
    const thisDinero:Dinero.Dinero = toDinero(this);
    const resultDinero:Dinero.Dinero = thisDinero.divide(divisor);
    const result = toCurrencyAmount(resultDinero);
    validateSafeMax(result);
    return result;
  }

  multiply(multiplier:number):CurrencyAmount {
    const thisDinero:Dinero.Dinero = toDinero(this);
    const resultDinero:Dinero.Dinero = thisDinero.multiply(multiplier);
    const result = toCurrencyAmount(resultDinero);
    validateSafeMax(result);
    return result;
  }

  square():CurrencyAmount {
    // this is not going to be the most accurate way of calculating because we end up rounding
    // probably need to using units that are 100th of a minor unit
    const thisDinero:Dinero.Dinero = toDinero(this);
    const amount = thisDinero.getAmount();
    const squared = Math.round(amount * amount);
    const result = new CurrencyAmount(squared, this.currencyCode);
    validateSafeMax(result);
    return result;
  }

  squareRoot():CurrencyAmount {
    // this is not going to be the most accurate way of calculating because we end up rounding
    // probably need to using units that are 100th of a minor unit
    const thisDinero:Dinero.Dinero = toDinero(this);
    const amount = thisDinero.getAmount();
    const squareRoot = Math.round(Math.sqrt(amount));
    const result = new CurrencyAmount(squareRoot, this.currencyCode);
    validateSafeMax(result);
    return result;
  }

  greaterThan(that:CurrencyAmount):boolean {
    validateCurrencyCodes(this, that);
    const thisDinero:Dinero.Dinero = toDinero(this);
    const thatDinero:Dinero.Dinero = toDinero(that);
    return thisDinero.greaterThan(thatDinero);
  }

  greaterThanOrEqual(that:CurrencyAmount):boolean {
    validateCurrencyCodes(this, that);
    const thisDinero:Dinero.Dinero = toDinero(this);
    const thatDinero:Dinero.Dinero = toDinero(that);
    return thisDinero.greaterThanOrEqual(thatDinero);
  }

  lessThan(that:CurrencyAmount):boolean {
    validateCurrencyCodes(this, that);
    const thisDinero:Dinero.Dinero = toDinero(this);
    const thatDinero:Dinero.Dinero = toDinero(that);
    return thisDinero.lessThan(thatDinero);
  }

  lessThanOrEqual(that:CurrencyAmount):boolean {
    validateCurrencyCodes(this, that);
    const thisDinero:Dinero.Dinero = toDinero(this);
    const thatDinero:Dinero.Dinero = toDinero(that);
    return thisDinero.lessThanOrEqual(thatDinero);
  }

  isPositive():boolean {
    return this.greaterThan(Zero(this.currencyCode));
  }

  isZeroOrPositive():boolean {
    return this.greaterThanOrEqual(Zero(this.currencyCode));
  }

  abs():CurrencyAmount {
    return new CurrencyAmount(
      Math.abs(this.amountInMinorUnits),
      this.currencyCode,
    )
  }

  toString():string {
    const thisDinero:Dinero.Dinero = toDinero(this);
    return thisDinero.toFormat();
  }

  toCurrencyAmountLike():CurrencyAmountLike {
    return {
      amountInMinorUnits: this.amountInMinorUnits,
      currencyCode: this.currencyCode,
    }
  }

}

const validateCurrencyCodes = (currencyAmount1:CurrencyAmount, currencyAmount2:CurrencyAmount):void => {
  if (currencyAmount1.currencyCode !== currencyAmount2.currencyCode) {
    throw new InvalidArgumentError(`Expected currency amounts to have the same currency code, actual: ${currencyAmount1.currencyCode} and ${currencyAmount2.currencyCode}`);
  }
}

const validateSafeMax = (currencyAmount:CurrencyAmount):void => {
  const max = Max(currencyAmount.currencyCode);
  if (currencyAmount.amountInMinorUnits > max.amountInMinorUnits) {
    throw new UnexpectedError(`CurrencyAmount: ${currencyAmount.toString()} has exceeded the max safe amount: ${max.toString()}`)
  }
}

const toDinero = (currencyAmount:CurrencyAmount):Dinero.Dinero => {
  return Dinero({ amount: currencyAmount.amountInMinorUnits, currency: currencyAmount.currencyCode });
}

const toCurrencyAmount = (dinero:Dinero.Dinero):CurrencyAmount => {
  return new CurrencyAmount(dinero.getAmount(), <CurrencyCode>dinero.getCurrency())
}