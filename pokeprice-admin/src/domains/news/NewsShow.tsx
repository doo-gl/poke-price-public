import {
  BooleanField,
  DateField, EditButton,
  ImageField,
  Show,
  ShowProps,
  SimpleShowLayout,
  TextField,
  TopToolbar,
  UrlField
} from "react-admin";
import React from "react";


const Actions = (props:any) => (
  <TopToolbar>
    <EditButton basePath={props.basePath} record={props.data} />
  </TopToolbar>
);

export const NewsShow = (props:ShowProps) => {

  return (
    <Show {...props} actions={<Actions/>}>
      <SimpleShowLayout>
        <TextField source="id" />
        <DateField showTime source="dateCreated" />
        <DateField showTime source="dateLastModified" />
        <DateField source="date" />
        <TextField source="category" />
        <BooleanField source="active" />
        <TextField source="title" />
        <TextField source="description" />
        <ImageField source="imageUrl" />
        <ImageField source="backgroundImageUrl" />
        <UrlField source="newsLink" />
      </SimpleShowLayout>
    </Show>
  )
}