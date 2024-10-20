import {DOMAIN} from "../Domains";
import {adminClient} from "../../infrastructure/AdminClient";
import {FileField, FileInput, SelectInput} from "react-admin";
import * as React from "react";
import {CreatePage} from "../CreatePage";


export const ItemCsvCreate = () => {
  return (
    <CreatePage
      domain={DOMAIN.ITEM}
      title="Bulk Create Item"
      skipRedirect
      onSave={async (data,) => {
        const file = data.csvFile.rawFile
        const reader = new FileReader()
        await new Promise<void>((resolve, reject) => {
          reader.readAsText(file)
          reader.addEventListener("load", () => {
            resolve()
          })
        })

        const csvContent:any = reader.result
        return adminClient.bulkCsvCreateItem({
          itemType: data.itemType,
          csv: csvContent
        })
      }}
    >
      <SelectInput source="itemType" label="Item Type" defaultValue={'GENERIC'} choices={[
        { id: 'GENERIC', name: 'GENERIC' },
        // { id: 'POKEMON_CARD', name: 'POKEMON_CARD' },
      ]} />
      <FileInput label="Item CSV" source="csvFile" accept="text/csv" >
        <FileField source="src" title="title" />
      </FileInput>
    </CreatePage>
  )
}