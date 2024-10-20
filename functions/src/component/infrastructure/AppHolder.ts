import {AdminApp, buildAdminApp, buildClientApp, buildPubSub, ClientApp, PubSub} from "../external-lib/Firebase";


let adminApp:AdminApp|null = null;
let clientApp:ClientApp|null = null;
let pubSub:PubSub|null = null

const initAdmin = () => {
  if (adminApp) {
    return adminApp;
  }
  adminApp = buildAdminApp()
  return adminApp;
}

const initClient = () => {
  if (clientApp) {
    return clientApp;
  }
  clientApp = buildClientApp()
  return clientApp;
}

const initPubSub = () => {
  if (pubSub) {
    return pubSub
  }
  pubSub = buildPubSub()
  return pubSub;
}

const getAdminApp = ():AdminApp => {
  if (!adminApp) {
    return initAdmin();
  }
  return adminApp;
}

const getClientApp = ():ClientApp => {
  if (!clientApp) {
    return initClient();
  }
  return clientApp;
}

const getPubSub = ():PubSub => {
  if (!pubSub) {
    return initPubSub()
  }
  return pubSub;
}

export const appHolder = {
  getAdminApp,
  getClientApp,
  getPubSub,
}