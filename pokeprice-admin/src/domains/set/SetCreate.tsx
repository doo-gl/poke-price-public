import {DOMAIN} from "../Domains";
import {DateInput, TextInput} from "react-admin";
import * as React from "react";
import {CreatePage} from "../CreatePage";
import {adminClient} from "../../infrastructure/AdminClient";
import {parseKey, validateImageUrl} from "../InputHelpers";


export const SetCreate = () => {
  return (
    <CreatePage
      domain={DOMAIN.SET}
      title="Create Set"
      onSave={async data => adminClient.createSet(data)}
    >
      <TextInput label="Series" source="series" parse={parseKey} />
      <TextInput label="Name" source="name" parse={parseKey} />
      <TextInput label="Image Url" source="imageUrl" validate={validateImageUrl} />
      <TextInput label="Background Image Url" source="backgroundImageUrl" validate={validateImageUrl} />
      <TextInput label="Symbol Url" source="symbolUrl" validate={validateImageUrl} />
      <DateInput label="Release Date" source="releaseDate" />
      <TextInput label="Display Set Number" source="displaySetNumber" parse={(input:any) => input.toLowerCase()} />
    </CreatePage>
  )
}