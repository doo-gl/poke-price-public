import {Datagrid, DateField, List, ListProps, TextField} from "react-admin";
import {Pagination} from "../../components/Pagination";
import {Filter} from "../../components/Filter";
import {DOMAIN} from "../Domains";
import React from "react";


export const CacheEntryList = (props:ListProps) => {
  return (
    <List
      {...props}
      pagination={<Pagination/>}
      filters={<Filter domain={DOMAIN.CACHE_ENTRY} />}
    >
      <Datagrid rowClick='show' >
        <TextField source="id" />
        <DateField showTime source="dateCreated" />
        <DateField showTime source="dateEntryExpires" />
        <TextField source="entryType" />
        <TextField source="key" />
      </Datagrid>
    </List>
  )
}