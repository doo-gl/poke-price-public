import {Datagrid, NumberField, Record, ReferenceArrayField, SingleFieldList, TextField} from "react-admin";
import {CurrencyCode} from "../common/CurrencyCode";
import React, {CSSProperties} from "react";
import {CurrencyAmountField} from "./CurrencyAmountField";
import {DOMAIN} from "../domains/Domains";
import {BareArrayField} from "./BareArrayField";
import {fromOptionalCurrencyAmountLike} from "../common/CurrencyAmount";
import {itemPriceQuerier, PriceType} from "../common/ItemPriceQuerier";


interface Props {
  currencyCode:CurrencyCode,
  priceType:PriceType,
  record?:Record,
  data?:any
  label?:string,
  addLabel?:boolean,
  style?:CSSProperties
}

export const ItemPriceDetailsField = (props:Props) => {
  const {
    record,
    data,
    label,
    style,
    addLabel,
    currencyCode,
    priceType,
  } = props;
  if (!record || !record.itemPrices || !record.itemPrices.prices || !Array.isArray(record.itemPrices.prices)) {
    return null
  }
  const details = itemPriceQuerier.query(currencyCode, priceType, record.itemPrices)
  return (
    <div>
      <div>
        {fromOptionalCurrencyAmountLike(details?.price ?? null)?.toString() ?? '-'}
      </div>
      <div>
        Vol: {details?.volume ?? '-'}
      </div>
    </div>
  )
}

