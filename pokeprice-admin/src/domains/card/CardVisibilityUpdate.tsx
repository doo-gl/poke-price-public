import {UpdatePage} from "../UpdatePage";
import {DOMAIN} from "../Domains";
import {adminClient} from "../../infrastructure/AdminClient";
import {BooleanInput, ReferenceField, TextField, TextInput} from "react-admin";
import * as React from "react";

export const CardVisibilityUpdate = () => {
  return (
    <UpdatePage
      domain={DOMAIN.CARD}
      title="Update Card Image"
      onSave={data => adminClient.updateVisibilityForCard(data.id, data.visible)}
    >
      <ReferenceField source="id" reference={DOMAIN.CARD} link='show'>
        <TextField source="id" />
      </ReferenceField>
      <BooleanInput label="Visible" source="visible" />
    </UpdatePage>
  )
}