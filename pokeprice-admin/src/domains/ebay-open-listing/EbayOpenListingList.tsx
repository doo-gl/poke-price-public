import {Datagrid, DateField, List, ListProps, NumberField, ReferenceField, TextField} from "react-admin";
import {Pagination} from "../../components/Pagination";
import {Filter} from "../../components/Filter";
import {DOMAIN} from "../Domains";
import {CurrencyAmountField} from "../../components/CurrencyAmountField";
import React from "react";


export const EbayOpenListingList = (props:ListProps) => {
  return (
    <List
      {...props}
      pagination={<Pagination/>}
      filters={<Filter domain={DOMAIN.EBAY_OPEN_LISTING} />}
    >
      <Datagrid rowClick='show' >
        <TextField source="id" />
        <TextField source="cardId" />
        <CurrencyAmountField label='Price' source='mostRecentPrice' />
        <TextField source="state" />
        <NumberField source="buyingOpportunity.score" label='Buy opportunity' />
      </Datagrid>
    </List>
  )
}