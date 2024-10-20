import {Datagrid, DateField, List, ListProps, TextField} from "react-admin";
import {Pagination} from "../../components/Pagination";
import {Filter} from "../../components/Filter";
import {DOMAIN} from "../Domains";
import React from "react";


export const MigrationList = (props:ListProps) => {
  return (
    <List
      {...props}
      pagination={<Pagination/>}
      filters={<Filter domain={DOMAIN.MIGRATION} />}
    >
      <Datagrid rowClick='show' >
        <TextField source="id" />
        <DateField showTime source="dateStateStarted" />
        <TextField source="state" />
        <TextField source="name" />
        <TextField source="version" />
      </Datagrid>
    </List>
  )
}