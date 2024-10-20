import {UpdatePage} from "../UpdatePage";
import {DOMAIN} from "../Domains";
import {adminClient} from "../../infrastructure/AdminClient";
import {ReferenceField, TextField, TextInput} from "react-admin";
import * as React from "react";

export const ItemImageUpdate = () => {
  return (
    <UpdatePage
      domain={DOMAIN.ITEM}
      title="Update Item Image"
      onSave={data => adminClient.updateImageForCard(data.id, data.imageUrl)}
    >
      <ReferenceField source="id" reference={DOMAIN.ITEM} link='show'>
        <TextField source="id" />
      </ReferenceField>
      <TextInput label="Image url" source="imageUrl" />
    </UpdatePage>
  )
}