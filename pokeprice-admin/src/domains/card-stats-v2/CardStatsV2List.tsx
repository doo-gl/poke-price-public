import {BooleanField, Datagrid, List, ListProps, NumberField, ReferenceField, TextField} from "react-admin";
import {Pagination} from "../../components/Pagination";
import {Filter} from "../../components/Filter";
import {DOMAIN} from "../Domains";
import React from "react";
import {CurrencyAmountField} from "../../components/CurrencyAmountField";


export const CardStatsV2List = (props:ListProps) => {
  return (
    <List
      {...props}
      pagination={<Pagination/>}
      filters={<Filter domain={DOMAIN.CARD_STATS_V2} />}
    >
      <Datagrid rowClick='show' >
        <TextField source="id" />
        <TextField source="priceType" />
        <TextField source="currencyCode" />
        <TextField source="condition" />
        <NumberField source="periodSizeDays" />
        <ReferenceField label='Card' reference={DOMAIN.ITEM} source='cardId' link='show'>
          <TextField source="id" />
        </ReferenceField>
        <NumberField label="Volume" source="stats.count" />
        <CurrencyAmountField label="Price" source="stats.median" />
      </Datagrid>
    </List>
  )
}