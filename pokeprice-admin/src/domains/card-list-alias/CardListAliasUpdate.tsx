import {UpdatePage} from "../UpdatePage";
import {DOMAIN} from "../Domains";
import {ArrayInput, ReferenceField, SimpleFormIterator, TextField, TextInput, useDataProvider} from "react-admin";
import * as React from "react";
import {parseSlug} from "../InputHelpers";

export const CardListAliasUpdate = () => {
  const dataProvider = useDataProvider()
  return (
    <UpdatePage
      domain={DOMAIN.CARD_LIST_ALIAS}
      title="Update Card List Alias"
      onSave={async data => {
        await dataProvider.update(DOMAIN.CARD_LIST_ALIAS, data)
      }}
    >
      <ReferenceField source="id" reference={DOMAIN.CARD_LIST_ALIAS} link='show'>
        <TextField source="id" />
      </ReferenceField>
      <TextInput label="Canonical Slug" source="canonicalSlug" parse={parseSlug} />
      <TextInput label="Alias Slug" source="aliasSlug" parse={parseSlug} />
      <TextInput label="Title" source="title" defaultValue={null} />
      <TextInput label="Description" source="description" defaultValue={null} />
      <ArrayInput label="Image Urls" source="imageUrls" defaultValue={[]}>
        <SimpleFormIterator><TextInput source=''/></SimpleFormIterator>
      </ArrayInput>
    </UpdatePage>
  )
}