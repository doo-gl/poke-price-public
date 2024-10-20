
import {lodash} from "../external-lib/Lodash";
import {queryString} from "../external-lib/QueryString";
import ActionList from "@material-ui/icons/List";
import * as React from "react";
import { Link } from 'react-router-dom';
import Button from '@material-ui/core/Button';


interface Props {
  record?:any,
  source:string,
  label:string,
  domain:string,
  queryField?:string,
  queryValueExtractor?:(record:any) => any,
}

export const GoToListField = (props:Props) => {
  const queryField = props.queryField ? props.queryField : props.source;
  const queryValue = props.queryValueExtractor
    ? props.queryValueExtractor(props.record)
    : lodash.get(props.record, props.source);
  const filter:{[key:string]:any} = {};
  filter[queryField] = queryValue;
  return (
    <Button
      color="primary"
      component={Link}
      to={{
        pathname: `/${props.domain}`,
        search: `filter=${JSON.stringify(filter)}`,
      }}
    >
      {props.label}
    </Button>
  )
}