import {Card, CardContent, Snackbar} from "@material-ui/core";
import {CreateContextProvider, SaveButton, SimpleForm, Title, Toolbar, useCreateController, useRedirect} from "react-admin";
import * as React from "react";
import {useState} from "react";
import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';


interface Props {
  domain:string,
  children:React.ReactNode,
  title:string,
  onSave:(data:any) => Promise<any>
  skipRedirect?:boolean,
}


export const CreatePage = (props:Props) => {
  const {
    domain,
    title,
    skipRedirect,
  } = props
  const controllerProps = useCreateController({
    basePath: `/${domain}`,
    resource: domain,
  });
  const redirectTo = useRedirect()
  const [snackbarContent, setSnackbarContent] = useState<string|null>(null)
  const [isSaving, setIsSaving] = useState<boolean>(false)

  const handleClose = (event:any) => {
    setSnackbarContent(null);
  };

  const onSave = (data:any, redirect:any, options?:{onSuccess:() => void, onFailure:(err:any) => void}) => {
    setIsSaving(true)
    props.onSave(data)
      .then((res) => {
        setSnackbarContent('Create successful')
        if (options?.onSuccess) {
          options.onSuccess()
        }
        if (!skipRedirect) {
          redirectTo("show", `/${domain}`, res.id)
        }
      })
      .catch(err => {
        const message = err.isAxiosError && err.response.data
          ? `Failed: ${err.message}, Details: ${JSON.stringify(err.response.data , null, 2)}`
          : `Failed: ${err.message}`
        setSnackbarContent(message)
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

      <CardContent>
        <CreateContextProvider value={controllerProps}>
          <SimpleForm
            basePath={controllerProps.basePath}
            record={controllerProps.record}
            redirect="show"
            resource={controllerProps.resource}
            version={controllerProps.version}
            save={onSave}
            saving={isSaving}
            toolbar={<OnlySaveToolbar/>}
          >
            {props.children}
          </SimpleForm>
        </CreateContextProvider>

      </CardContent>
      <Snackbar
        open={snackbarContent !== null}
        autoHideDuration={10000}
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