import {DOMAIN} from "../Domains";
import {adminClient} from "../../infrastructure/AdminClient";
import {
  ArrayInput,
  BooleanInput,
  DateInput,
  ReferenceField,
  SelectInput,
  SimpleFormIterator,
  TextField,
  TextInput
} from "react-admin";
import * as React from "react";
import {CreatePage} from "../CreatePage";
import {parseKey, validateImageUrl, validateUuid} from "../InputHelpers";

// setId:string,
//   cardName:string,
//   cardNumber:string,
//   superType:string,
//   subTypes:Array<string>,
//   types:Array<string>,
//   rarity:string|null,
//   imageUrl:string,
//   artist:string|null,
//   flavourText:string|null,
//   variant:CardVariant,

export const CardCreate = () => {
  return (
    <CreatePage
      domain={DOMAIN.CARD}
      title="Create Card"
      onSave={data => {
        return adminClient.createCard({
          subTypes: [],
          types: [],
          rarity: null,
          artist: null,
          flavourText: null,
          ...data
        })
      }}
    >
      <TextInput label="Set ID" source="setId" validate={validateUuid} />
      <TextInput label="Card Name" source="cardName" />
      <TextInput label="Card Number" source="cardNumber" parse={(input:any) => input.toLowerCase()} />
      <TextInput label="Super Type" source="superType" />
      <TextInput label="Rarity" source="rarity" />
      <TextInput label="Artist" source="artist" />
      <TextInput label="Flavour Text" source="flavourText" />
      <SelectInput source="variant" label="Variant" choices={[
        { id: 'DEFAULT', name: 'DEFAULT' },
        { id: 'REVERSE_HOLO', name: 'REVERSE_HOLO' },
      ]} />
      <TextInput label="Image Url" source="imageUrl" validate={validateImageUrl} />
      <ArrayInput label="Sub Types" source="subTypes">
        <SimpleFormIterator><TextInput source=''/></SimpleFormIterator>
      </ArrayInput>
      <ArrayInput label="Energy Types" source="types">
        <SimpleFormIterator><TextInput source=''/></SimpleFormIterator>
      </ArrayInput>
    </CreatePage>
  )
}