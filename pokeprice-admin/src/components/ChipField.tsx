import {Record} from "react-admin";
import {CSSProperties} from "react";
import {Chip} from "@material-ui/core";
import {lodash} from "../external-lib/Lodash";
import * as React from "react";


interface Props {
  record?:Record,
  source:string,
  style?:CSSProperties,
  colour?:'primary',
  afterIconMapper?:(record:any) => React.ReactElement|undefined
}

export const ChipField = (props:Props) => {
  const { source, record } = props;
  if (!record) {
    return null;
  }
  const value = lodash.get(record, source);
  if (!value) {
    return null;
  }
  const deleteIcon = props.afterIconMapper ? props.afterIconMapper(record) : undefined;
  const onDelete = deleteIcon ? () => {} : undefined;
  return (
    <Chip
      color={props.colour}
      label={value}
      onDelete={onDelete}
      deleteIcon={deleteIcon}
      style={props.style}
    />
  )
}