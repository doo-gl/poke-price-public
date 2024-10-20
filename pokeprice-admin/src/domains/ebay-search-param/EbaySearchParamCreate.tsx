import {CreateProps, Create, TextInput, BooleanInput, SimpleForm, SimpleFormIterator, ArrayInput} from "react-admin";
import React from "react";



export const EbaySearchParamCreate = (props:CreateProps) => {

  return (
    <Create {...props} >
      <SimpleForm>
        <TextInput disabled label="Card Id" source="cardId" />
        <ArrayInput source="includeKeywords">
          <SimpleFormIterator><TextInput source=''/></SimpleFormIterator>
        </ArrayInput>
        <ArrayInput source="excludeKeywords">
          <SimpleFormIterator><TextInput source=''/></SimpleFormIterator>
        </ArrayInput>
      </SimpleForm>
    </Create>
  )
}