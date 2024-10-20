import {
  BooleanField,
  CreateButton,
  Datagrid,
  DateField,
  EditButton,
  List,
  ListProps,
  TextField,
  TopToolbar
} from "react-admin";
import {Pagination} from "../../components/Pagination";
import {Filter} from "../../components/Filter";
import {DOMAIN} from "../Domains";
import React from "react";

const Actions = (props:any) => (
  <TopToolbar>
    <CreateButton basePath={props.basePath} />
  </TopToolbar>
);

export const NewsList = (props:ListProps) => {
  return (
    <List
      {...props}
      pagination={<Pagination/>}
      filters={<Filter domain={DOMAIN.NEWS} />}
      actions={<Actions/>}
    >
      <Datagrid rowClick='show' >
        <TextField source="id" />
        <DateField source="date" />
        <TextField source="title" />
        <BooleanField source="active" />
      </Datagrid>
    </List>
  )
}