import {BooleanInput, Edit, EditProps, SimpleForm, TextInput} from "react-admin";
import React from "react";


export const NewsEdit = (props:EditProps) => {
  return (
    <Edit {...props}>
      <SimpleForm>
        <TextInput disabled label="Id" source="id" />
        <TextInput disabled label="Title" source="title" />
        <BooleanInput source='active' />
      </SimpleForm>
    </Edit>
  )
}