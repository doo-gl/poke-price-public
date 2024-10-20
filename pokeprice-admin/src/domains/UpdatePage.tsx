import {Button, Card, CardActions, CardContent, Snackbar} from "@material-ui/core";
import {EditContextProvider, SaveButton, SimpleForm, Title, Toolbar, useEditController} from "react-admin";

import {Link, useParams} from "react-router-dom"
import * as React from "react";
import {useState} from "react";
import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';


interface Props {
  domain:string,
  children:React.ReactNode,
  title:string,
  onSave:(data:any) => Promise<void>
}


export const UpdatePage = (props:Props) => {
  const {
    domain,
    title,
  } = props
  const params = useParams<any>();
  const id = params.id
  const controllerProps = useEditController({
    basePath: `/${domain}`,
    resource: domain,
    id: id,
  });
  const [snackbarContent, setSnackbarContent] = useState<string|null>(null)
  const [isSaving, setIsSaving] = useState<boolean>(false)

  const handleClose = (event:any) => {
    setSnackbarContent(null);
  };

  const onSave = (data:any, redirect:any, options?:{onSuccess:() => void, onFailure:(err:any) => void}) => {
    setIsSaving(true)
    props.onSave(data)
      .then(() => {
        setSnackbarContent('Updated successful')
        if (options?.onSuccess) {
          options.onSuccess()
        }
      })
      .catch(err => {
        setSnackbarContent(`Failed: ${err.message}`)
        if (options?.onFailure) {
          options.onFailure(err)
        }
      })
      .finally(() => {
        setIsSaving(false)
      })
  }

  return (
    <Card>
      <Title title={title} />
      <CardActions style={{flexDirection: 'row', justifyContent: 'flex-end'}}>
        <Button
          size="small"
          variant="outlined"
          component={Link}
          to={{
            pathname: `/${domain}/${id}/show`,
          }}
        >
          Back to {domain.replace(/-/gim, ' ')}
        </Button>
      </CardActions>

      <CardContent>
        <EditContextProvider value={controllerProps}>
          <SimpleForm
            basePath={controllerProps.basePath}
            record={controllerProps.record}
            redirect={controllerProps.redirect}
            resource={controllerProps.resource}
            version={controllerProps.version}
            save={onSave}
            saving={isSaving}
            toolbar={<OnlySaveToolbar/>}
          >
            {props.children}
          </SimpleForm>
        </EditContextProvider>

      </CardContent>
      <Snackbar
        open={snackbarContent !== null}
        autoHideDuration={6000}
        onClose={handleClose}
        message={snackbarContent}
        action={
          <IconButton size="small" aria-label="close" color="inherit" onClick={handleClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />
    </Card>
  );
}

const OnlySaveToolbar = (props:any) => (
  <Toolbar {...props} >
    <SaveButton />
  </Toolbar>
)