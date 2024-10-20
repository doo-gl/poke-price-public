import {Datagrid, DateField, List, ListProps, ReferenceField, TextField} from "react-admin";
import {Pagination} from "../../components/Pagination";
import {Filter} from "../../components/Filter";
import {DOMAIN} from "../Domains";
import React from "react";


export const UserList = (props:ListProps) => {
  return (
    <List
      {...props}
      pagination={<Pagination/>}
      filters={<Filter domain={DOMAIN.USER} />}
      sort={{order: "dateLastModified", field: "DESC"}}
    >
      <Datagrid rowClick='show' >
        <ReferenceField label='ID' reference={DOMAIN.USER} source='id' link='show'>
          <TextField source="id" />
        </ReferenceField>
        <TextField source="details.email" />
        <DateField showTime source="dateCreated" />
        <DateField showTime source="dateLastModified" />
        <ReferenceField label='Parent User id' reference={DOMAIN.USER} source='parentUserId' link='show'>
          <TextField source="id" />
        </ReferenceField>
      </Datagrid>
    </List>
  )
}