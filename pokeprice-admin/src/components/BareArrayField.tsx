import {lodash} from "../external-lib/Lodash";
import {ArrayField, SingleFieldList, TextField} from "react-admin";
import {Chip} from "@material-ui/core";

interface Props {
  record?:any,
  source:string,
  label?:string,
  addLabel?:boolean,
  colour?:'primary'
}

export const BareArrayField = (props:Props) => {
  const sourceList = lodash.get(props.record, props.source)
  if (!sourceList || !Array.isArray(sourceList) || sourceList.length === 0) {
    return null
  }
  return (
    <div>
      {sourceList.map(item => <Chip key={item} label={item} color={props.colour} style={{margin: 2}} />)}
    </div>
  )
}