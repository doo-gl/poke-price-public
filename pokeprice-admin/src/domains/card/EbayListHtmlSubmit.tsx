import {UpdatePage} from "../UpdatePage";
import {DOMAIN} from "../Domains";
import {adminClient} from "../../infrastructure/AdminClient";
import {ReferenceField, TextField, TextInput} from "react-admin";
import * as React from "react";

export const EbayListHtmlSubmit = () => {
  return (
    <UpdatePage
      domain={DOMAIN.CARD}
      title="Submit Ebay List Html"
      onSave={data => adminClient.submitEbayListHtml(data.id, data.html)}
    >
      <ReferenceField source="id" reference={DOMAIN.CARD} link='show'>
        <TextField source="id" />
      </ReferenceField>
      <TextInput label="HTML" source="html" />
    </UpdatePage>
  )
}

