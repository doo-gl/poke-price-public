import {NumberField, Record} from "react-admin";
import React, {CSSProperties} from "react";
import {lodash} from "../external-lib/Lodash";
import {itemPriceQuerier, PriceType} from "../common/ItemPriceQuerier";
import {CurrencyCode} from "../common/CurrencyCode";

interface Props {
  record?:Record,
  priceType:'sold'|'listing',
  currency:CurrencyCode,
  label?:string,
  addLabel?:boolean,
  style?:CSSProperties
}

export const ItemVolumeField = (props:Props) => {
  const {
    priceType,
    record,
    currency,
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
    <NumberField
      source='amount'
      record={{id: record.id, amount: details?.volume}}
      style={style}
      label={label}
      addLabel={addLabel}
    />
  )
}