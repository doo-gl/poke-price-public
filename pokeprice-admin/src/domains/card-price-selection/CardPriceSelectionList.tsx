import {BooleanField, Datagrid, DateField, List, ListProps, ReferenceField, TextField} from "react-admin";
import {Pagination} from "../../components/Pagination";
import {Filter} from "../../components/Filter";
import {DOMAIN} from "../Domains";
import React from "react";


export const CardPriceSelectionList = (props:ListProps) => {
  return (
    <List
      {...props}
      pagination={<Pagination/>}
      filters={<Filter domain={DOMAIN.CARD_SELECTION} />}
    >
      <Datagrid rowClick='show' >
        <TextField source="id" />
        <TextField source="priceType" />
        <TextField source="currencyCode" />
        <TextField source="condition" />
        <BooleanField source="hasReconciled" />
        <ReferenceField label='Card' reference={DOMAIN.ITEM} source='cardId' link='show'>
          <TextField source="id" />
        </ReferenceField>
      </Datagrid>
    </List>
  )
}