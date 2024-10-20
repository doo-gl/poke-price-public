import {DOMAIN} from "../Domains";
import {ArrayInput, CreateProps, SimpleFormIterator, TextInput, useDataProvider} from "react-admin";
import * as React from "react";
import {CreatePage} from "../CreatePage";
import {parseKey, parseSlug} from "../InputHelpers";


export const CardListAliasCreate = (props:CreateProps) => {
  const dataProvider = useDataProvider()
  return (
    <CreatePage
      domain={DOMAIN.CARD_LIST_ALIAS}
      title="Create Card List Alias"
      onSave={async data => {
        const response = await dataProvider.create(DOMAIN.CARD_LIST_ALIAS, data)
        return response.data;
      }}
    >
      <TextInput label="Canonical Slug" source="canonicalSlug" parse={parseSlug} required />
      <TextInput label="Alias Slug" source="aliasSlug" parse={parseSlug} required />
      <TextInput label="Title" source="title" defaultValue={null} />
      <TextInput label="Description" source="description" defaultValue={null} />
      <ArrayInput label="Image Urls" source="imageUrls" defaultValue={[]}>
        <SimpleFormIterator><TextInput source=''/></SimpleFormIterator>
      </ArrayInput>
    </CreatePage>
  )
}