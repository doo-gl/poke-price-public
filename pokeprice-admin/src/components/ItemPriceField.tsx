import {Record} from "react-admin";
import React, {CSSProperties} from "react";
import {lodash} from "../external-lib/Lodash";
import {itemPriceQuerier, PriceType} from "../common/ItemPriceQuerier";
import {CurrencyCode} from "../common/CurrencyCode";
import {CurrencyAmountField} from "./CurrencyAmountField";

interface Props {
  record?:Record,
  priceType:'sold'|'listing',
  currency:CurrencyCode,
  label?:string,
  addLabel?:boolean,
  style?:CSSProperties
  component?:'chip'|'span'|'div'
}

export const ItemPriceField = (props:Props) => {
  const {
    priceType,
    record,
    currency,
    component,
    label,
    style,
    addLabel,
  } = props;
  if (!record) {
    return null;
  }
  const prices = lodash.get(record, 'itemPrices');
  if (!prices) {
    return null;
  }
  const price = priceType === "sold" ? PriceType.SALE : PriceType.LISTING
  const details = itemPriceQuerier.query(currency, price, prices)
  return (
    <CurrencyAmountField
      source='amount'
      record={{id: record.id, amount: details?.price}}
      style={style}
      label={label}
      addLabel={addLabel}
      component={component}
    />
  )
}