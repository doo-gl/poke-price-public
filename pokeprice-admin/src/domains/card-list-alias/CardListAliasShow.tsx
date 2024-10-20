import React from "react";
import {DateField, Show, ShowProps, Tab, TabbedShowLayout, TextField, useShowController} from "react-admin";


export const CardListAliasShow = (props:ShowProps) => {
  const {record} = useShowController(props);
  return (
    <Show {...props}>
      <TabbedShowLayout>
        <Tab label='Details'>
          <TextField source="id" />
          <DateField showTime source="dateCreated" />
          <DateField showTime source="dateLastModified" />
          <TextField source="canonicalSlug" />
          <TextField source="aliasSlug" />
          <TextField source="title" />
          <TextField source="description" />
          {record?.imageUrls?.map((imageUrl:string) =>
              <div>
                <img key={imageUrl} src={imageUrl} />
              </div>
          )}
        </Tab>
      </TabbedShowLayout>
    </Show>
  )
}

