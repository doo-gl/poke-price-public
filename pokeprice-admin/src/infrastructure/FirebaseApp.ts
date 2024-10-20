import googleFirebase from 'firebase/app';
import 'firebase/auth';
import {configRetriever} from "./ConfigRetriever";
import {UnexpectedError} from "../common/UnexpectedError";

let app:googleFirebase.app.App|null = null;

const init = () => {
  if (app) {
    return;
  }
  const config = configRetriever.retrieve();
  app = googleFirebase.initializeApp(config.firebase);
  if (config.useAuthEmulator) {
    auth().useEmulator('http://localhost:9099')
  }
}

const getApp = ():googleFirebase.app.App => {
  if (!app) {
    throw new UnexpectedError(`App does not exist yet`)
  }
  return app;
}

const auth = ():googleFirebase.auth.Auth => {
  return getApp().auth()
}

export const firebaseApp = {
  init,
  auth,
}