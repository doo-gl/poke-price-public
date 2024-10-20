import {ArrayField, Datagrid, DateField, Show, ShowProps, SimpleShowLayout, TextField} from "react-admin";
import React from "react";


export const MigrationShow = (props:ShowProps) => {

  return (
    <Show {...props}>
      <SimpleShowLayout>
        <TextField source="id" />
        <DateField showTime source="dateCreated" />
        <DateField showTime source="dateLastModified" />
        <DateField showTime source="dateStateStarted" />
        <TextField source="state" />
        <TextField source="subState" />
        <ArrayField source="history">
          <Datagrid>
            <DateField showTime source="dateStateStarted" />
            <TextField source="state" />
            <TextField source="subState" />
            <TextField source="detail" />
          </Datagrid>
        </ArrayField>
        <TextField source="name" />
        <TextField source="version" />
        <TextField source="lastProcessedId" />
      </SimpleShowLayout>
    </Show>
  )
}