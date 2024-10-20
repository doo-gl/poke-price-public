import {BooleanField, Datagrid, DateField, List, ListProps, ReferenceField, TextField} from "react-admin";
import {Pagination} from "../../components/Pagination";
import {Filter} from "../../components/Filter";
import {DOMAIN} from "../Domains";
import React from "react";


export const EbaySearchParamList = (props:ListProps) => {
  return (
    <List
      {...props}
      pagination={<Pagination/>}
      filters={<Filter domain={DOMAIN.EBAY_SEARCH_PARAMS} />}
    >
      <Datagrid rowClick='show' >
        <TextField source="id" />
        <BooleanField source="active" />
        <DateField showTime source="dateCreated" />
        <TextField source="includeKeywords" />
        <ReferenceField label='Card' reference={DOMAIN.ITEM} source='cardId' link='show'>
          <TextField source="id" />
        </ReferenceField>
      </Datagrid>
    </List>
  )
}