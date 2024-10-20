import React from "react";
import {DateField, NumberField, Show, ShowProps, SimpleShowLayout, TextField} from "react-admin";


export const CacheEntryShow = (props:ShowProps) => {

  return (
    <Show {...props}>
      <SimpleShowLayout>
        <TextField source="id" />
        <DateField showTime source="dateCreated" />
        <DateField showTime source="dateLastModified" />
        <DateField showTime source="dateEntryExpires" />
        <TextField source="entryType" />
        <TextField source="key" />
        <TextField source="value" />
      </SimpleShowLayout>
    </Show>
  )
}