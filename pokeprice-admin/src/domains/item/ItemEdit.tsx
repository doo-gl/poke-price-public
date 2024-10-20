import React from "react"
import {BooleanInput, Edit, EditProps, SimpleForm, TextInput} from "react-admin";


export const ItemEdit = (props:EditProps) => {
  return (
    <Edit {...props}>
      <SimpleForm>
        <TextInput disabled label="Id" source="id" />
        <TextInput source='name' />
        <BooleanInput source='visible' />
      </SimpleForm>
    </Edit>
  )
}