import {NumberField, Record, TextField} from "react-admin";
import React, {CSSProperties} from "react";
import {lodash} from "../external-lib/Lodash";
import {itemPriceQuerier, PriceType} from "../common/ItemPriceQuerier";
import {CurrencyCode} from "../common/CurrencyCode";

interface Props {
  record?:Record,
  label?:string,
  addLabel?:boolean,
  style?:CSSProperties
}

export const ItemNameField = (props:Props) => {
  const {
    record,
    label,
    style,
    addLabel,
  } = props;
  if (!record) {
    return null;
  }
  const displayName = lodash.get(record, 'displayName');
  const itemType = lodash.get(record, 'itemType');
  if (!itemType || !displayName) {
    return null;
  }

  let fullName = displayName;
  if (itemType === 'single-pokemon-card') {
    const set = lodash.get(record, 'itemDetails.set');
    const variant = lodash.get(record, 'itemDetails.variant');
    if (variant === 'DEFAULT') {
      fullName = `${set} | ${fullName}`
    } else {
      fullName = `${set} ${fullName} ${variant}`
    }

  }

  return (
    <TextField
      source='name'
      record={{id: record.id, name: fullName}}
      style={style}
      label={label}
      addLabel={addLabel}
    />
  )
}