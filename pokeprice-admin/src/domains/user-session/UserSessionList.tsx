import {Datagrid, DateField, List, ListProps, NumberField, ReferenceField, TextField} from "react-admin";
import {Pagination} from "../../components/Pagination";
import {Filter} from "../../components/Filter";
import {DOMAIN} from "../Domains";
import React from "react";


export const UserSessionList = (props:ListProps) => {
  return (
    <List
      {...props}
      pagination={<Pagination/>}
      filters={<Filter domain={DOMAIN.USER_SESSION} />}
      sort={{field: 'dateCreated', order: "DESC"}}

    >
      <Datagrid rowClick='show' >
        <ReferenceField label='ID' reference={DOMAIN.USER_SESSION} source='id' link='show'>
          <TextField source="id" />
        </ReferenceField>
        <ReferenceField label='User ID' reference={DOMAIN.USER} source='userId' link='show'>
          <TextField source="id" />
        </ReferenceField>
        <DateField showTime source="dateCreated" label="Started" />
        <NumberField source="numberOfBeaconsReceived" />
        <NumberField source="sessionLengthInSeconds" />
      </Datagrid>
    </List>
  )
}