import {Datagrid, DateField, List, ListProps, ReferenceField, TextField} from "react-admin";
import {Pagination} from "../../components/Pagination";
import {Filter} from "../../components/Filter";
import {DOMAIN} from "../Domains";
import {CurrencyAmountField} from "../../components/CurrencyAmountField";
import React from "react";


export const CardPriceStatsList = (props:ListProps) => {
  return (
    <List
      {...props}
      pagination={<Pagination/>}
      filters={<Filter domain={DOMAIN.CARD_PRICE_STATS} />}
    >
      <Datagrid rowClick='show' >
        <TextField source="id" />
        <DateField showTime source="lastCalculationTime" />
        <DateField showTime source="mostRecentPrice" />
        <CurrencyAmountField source='shortViewStats.median' label='Poke Price' />
        <CurrencyAmountField source='openListingStats.median' label='Open Median'  />
        <ReferenceField label='Card' reference={DOMAIN.ITEM} source='cardId' link='show'>
          <TextField source="id" />
        </ReferenceField>
        <ReferenceField label='Search Id' reference={DOMAIN.EBAY_SEARCH_PARAMS} source='searchId' link='show'>
          <TextField source="id" />
        </ReferenceField>
      </Datagrid>
    </List>
  )
}