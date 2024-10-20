import {Datagrid, DateField, List, ListProps, ReferenceField, TextField,} from "react-admin";
import {Pagination} from "../../components/Pagination";
import React from "react";
import {CurrencyAmountField} from "../../components/CurrencyAmountField";
import {DOMAIN} from "../Domains";
import {Filter} from "../../components/Filter";


export const HistoricalCardPriceList = (props:ListProps) => {
  return (
    <List
      {...props}
      pagination={<Pagination/>}
      filters={<Filter domain={DOMAIN.HISTORICAL_CARD_PRICE} />}
    >
      <Datagrid rowClick='show' >
        <TextField source="id" />
        <DateField showTime source="timestamp" />
        <CurrencyAmountField label='Price' source='currencyAmount' />
        <ReferenceField label='Card' reference={DOMAIN.ITEM} source='cardId' link='show'>
          <TextField source="name" />
        </ReferenceField>
        <TextField source='priceDataType' />
        <TextField source='sourceType' />
      </Datagrid>
    </List>
  )
}