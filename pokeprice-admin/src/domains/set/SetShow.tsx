import React from "react";
import {
  DateField,
  ImageField,
  NumberField,
  Show,
  ShowProps,
  Tab,
  TabbedShowLayout,
  TextField,
  UrlField
} from "react-admin";
import {DOMAIN} from "../Domains";
import {GoToListField} from "../../components/GoToListField";
import {BareArrayField} from "../../components/BareArrayField";


export const SetShow = (props:ShowProps) => (
  <Show {...props}>
    <TabbedShowLayout>
      <Tab label='Details'>
        <TextField source="id" />
        <DateField showTime source="dateCreated" />
        <DateField showTime source="dateLastModified" />
        <TextField source="series" />
        <TextField source="set" />
        <DateField source="displaySetNumber" />
        <DateField source="releaseDate" />
        <TextField source="externalIdentifiers.POKEMON_TCG_API.code" label='Pokemon TCG API code' />
        <UrlField source="externalIdentifiers.POKEMON_TCG_API.url" label='Pokemon TCG API url' />
        <ImageField source="imageUrl" label='Set Image' />
        <ImageField source="symbolUrl" label='Set Symbol' />

        <BareArrayField source="searchKeywords.includes" addLabel />
        <BareArrayField source="searchKeywords.excludes" addLabel />
        <BareArrayField source="searchKeywords.ignores" addLabel />
      </Tab>
      <Tab label='Links'>
        <GoToListField source='id' queryField='itemDetails.setId' label='Go to Cards' domain={DOMAIN.ITEM} />
      </Tab>
    </TabbedShowLayout>
  </Show>
);