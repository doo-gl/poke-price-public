import {Datagrid, DateField, List, ListProps, TextField} from "react-admin";
import {Pagination} from "../../components/Pagination";
import {Filter} from "../../components/Filter";
import {DOMAIN} from "../Domains";
import React from "react";


export const CardPriceDataImportAttemptList = (props:ListProps) => {
  return (
    <List
      {...props}
      pagination={<Pagination/>}
      filters={<Filter domain={DOMAIN.CARD_PRICE_DATA_IMPORT_ATTEMPT} />}
    >
      <Datagrid rowClick='show' >
        <TextField source="id" />
        <DateField showTime source="dateStateStarted" />
        <TextField source="state" />
        <TextField source="importType" />
      </Datagrid>
    </List>
  )
}