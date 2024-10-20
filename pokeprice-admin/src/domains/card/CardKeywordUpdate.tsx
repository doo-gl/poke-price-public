import {ArrayInput, ReferenceField, SimpleFormIterator, TextField, TextInput} from "react-admin";
import * as React from "react";
import {DOMAIN} from "../Domains";
import {adminClient} from "../../infrastructure/AdminClient";
import {UpdatePage} from "../UpdatePage";

export const CardKeywordUpdate = () => {
  return (
    <UpdatePage
      domain={DOMAIN.CARD}
      title="Update Card Search Keywords"
      onSave={data => adminClient.updateKeywordsForCard(data.id, data.searchKeywords)}
    >
      <ReferenceField source="id" reference={DOMAIN.CARD} link='show'>
        <TextField source="id" />
      </ReferenceField>
      <ArrayInput label="Includes" source="searchKeywords.includes">
        <SimpleFormIterator><TextInput source=''/></SimpleFormIterator>
      </ArrayInput>
      <ArrayInput label="Excludes" source="searchKeywords.excludes">
        <SimpleFormIterator><TextInput source=''/></SimpleFormIterator>
      </ArrayInput>
      <ArrayInput label="Ignores" source="searchKeywords.ignores">
        <SimpleFormIterator><TextInput source=''/></SimpleFormIterator>
      </ArrayInput>
    </UpdatePage>
  )
}