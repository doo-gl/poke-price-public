import React, {useState} from "react";
import {LoadingState} from "../common/LoadingState";
import {Button} from "react-admin";
import {CircularProgress, Snackbar} from "@material-ui/core";
import {Cancel, Check} from "@material-ui/icons";
import {Alert} from "@material-ui/lab";

export interface Props {
  label:string,
  icon?:React.ReactElement,
  onPress:() => Promise<void>
}

export const SubmitButton = (props:Props) => {
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.NOT_STARTED);
  const [errorMessage, setErrorMessage] = useState<string>('')

  const onClick = () => {
    setLoadingState(LoadingState.IN_PROGRESS);
    props.onPress()
      .then(() => {
        setLoadingState(LoadingState.SUCCESSFUL);
      })
      .catch(err => {
        console.error(err);
        setErrorMessage(err.message)
        setLoadingState(LoadingState.FAILED);
      })
  }

  if (loadingState === LoadingState.IN_PROGRESS) {
    return <CircularProgress />
  }

  if (loadingState === LoadingState.SUCCESSFUL) {
    return <Button label={props.label} startIcon={<Check />} onClick={onClick} />
  }

  if (loadingState === LoadingState.FAILED && errorMessage.length > 0) {
    return (
      <React.Fragment>
        <Snackbar open={true}>
          <Alert variant='filled' elevation={6} severity="error" onClose={() => setErrorMessage('')}>
            {errorMessage}
          </Alert>
        </Snackbar>

        <Button label={props.label} startIcon={<Cancel />} onClick={onClick} />
      </React.Fragment>
    )
  }

  return (
    <Button label={props.label} startIcon={props.icon} onClick={onClick} />
  )
}