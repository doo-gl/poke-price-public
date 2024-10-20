import {Create, CreateProps, DateInput, SimpleForm, TextInput} from "react-admin";
import React from "react";


export const NewsCreate = (props:CreateProps) => {
  return (
    <Create {...props} >
      <SimpleForm>
        <TextInput label="Title" source="title" />
        <TextInput label="Description" source="description" />
        <DateInput label="Date" source="date" />
        <TextInput label="Category" source="category" />
        <TextInput label="Image Url" source="imageUrl" />
        <TextInput label="Background Image Url" source="backgroundImageUrl" />
        <TextInput label="News Link" source="newsLink" />
      </SimpleForm>
    </Create>
  )
}

