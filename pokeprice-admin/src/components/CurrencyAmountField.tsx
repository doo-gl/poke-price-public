import React, {CSSProperties} from 'react'
import {Record} from 'react-admin'
import {lodash} from "../external-lib/Lodash";
import {fromCurrencyAmountLike} from "../common/CurrencyAmount";
import {Chip} from "@material-ui/core";

interface Props {
  record?:Record,
  source:string,
  label?:string,
  addLabel?:boolean,
  style?:CSSProperties
  component?:'chip'|'span'|'div'
}

export const CurrencyAmountField = (props:Props) => {
  const { source, record } = props;
  if (!record) {
    return null;
  }
  const amount = lodash.get(record, source);
  if (!amount) {
    return null;
  }
  if (!amount.currencyCode || !(amount.amountInMinorUnits ?? null)) {
    return null
  }
  const value = fromCurrencyAmountLike(amount).toString();
  if (props.component === 'chip') {
    return <Chip style={props.style} color='primary' label={value} />
  }
  if (props.component === 'div') {
    return <div style={props.style}>{value}</div>;
  }
  return <span style={props.style}>{value}</span>;
}