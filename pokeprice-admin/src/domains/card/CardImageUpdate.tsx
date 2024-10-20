import {UpdatePage} from "../UpdatePage";
import {DOMAIN} from "../Domains";
import {adminClient} from "../../infrastructure/AdminClient";
import {ReferenceField, TextField, TextInput} from "react-admin";
import * as React from "react";

export const CardImageUpdate = () => {
  return (
    <UpdatePage
      domain={DOMAIN.CARD}
      title="Update Card Image"
      onSave={data => adminClient.updateImageForCard(data.id, data.imageUrl)}
    >
      <ReferenceField source="id" reference={DOMAIN.CARD} link='show'>
        <TextField source="id" />
      </ReferenceField>
      <TextInput label="Image url" source="imageUrl" />
    </UpdatePage>
  )
}