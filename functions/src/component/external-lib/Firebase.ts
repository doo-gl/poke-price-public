// eslint-disable-next-line import/no-unresolved
import {App as FirebaseAdminApp, initializeApp} from 'firebase-admin/app';
// eslint-disable-next-line import/no-unresolved
import {getStorage, Storage} from 'firebase-admin/storage';
// eslint-disable-next-line import/no-unresolved
import {Auth as FirebaseAdminAuth, getAuth as getAdminAuth} from 'firebase-admin/auth';
import {
  DocumentData as FirebaseDocumentData,
  CollectionReference as FirebaseCollectionReference,
  Firestore as FirebaseFirestore,
  QueryDocumentSnapshot as FirebaseQueryDocumentSnapshot,
  WriteResult as FirebaseWriteResult,
  getFirestore,
  FieldValue as FirebaseFieldValue,
  Timestamp as FirebaseTimestamp,
  // eslint-disable-next-line import/no-unresolved
} from 'firebase-admin/firestore';
import {
  FirebaseApp as FirebaseClientApp,
  initializeApp as initClientApp,
} from 'firebase/app';
import {
  Auth as FirebaseAuth,
  AuthCredential,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  FacebookAuthProvider,
  getAuth,
  OAuthCredential,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  User as FirebaseUser,
  UserCredential as FirebaseUserCredential,
} from 'firebase/auth';

import {PubSub as GooglePubSub} from "@google-cloud/pubsub";
import {configRetriever} from "../infrastructure/ConfigRetriever";
import {isProduction} from "../infrastructure/ProductionDecider";
import {UnexpectedError} from "../error/UnexpectedError";
import {logger} from "firebase-functions";


export type Timestamp = FirebaseTimestamp;
export const TimestampStatic = FirebaseTimestamp;
export const FieldValue = FirebaseFieldValue
export type UserCredential = FirebaseUserCredential
export type Firestore = FirebaseFirestore;
export type User = FirebaseUser;
export type DocumentData = FirebaseDocumentData;
export type CollectionReference<T> = FirebaseCollectionReference<T>;
export type QueryDocumentSnapshot<T> = FirebaseQueryDocumentSnapshot<T>;
export type WriteResult = FirebaseWriteResult;


export interface AdminApp {
  firebaseApp:() => FirebaseAdminApp,
  firestore:() => Firestore,
  storage:() => Storage,
  auth:() => FirebaseAdminAuth
}

export interface Auth {
  firebaseAuth:() => FirebaseAuth,
  signInWithCredential:(credential:AuthCredential) => Promise<UserCredential>,
  signInWithEmailAndPassword:(email:string, password:string) => Promise<UserCredential>,
  createUserWithEmailAndPassword:(email:string, password:string) => Promise<UserCredential>,
  facebookCredential:(accessToken:string) => OAuthCredential,
  sendPasswordResetEmail:(email:string) => Promise<void>,
}

export interface ClientApp {
  clientApp:() => FirebaseClientApp,
  auth:() => Auth
}

export interface PubSub {
  pubSub:() => GooglePubSub,
}

export const buildAdminApp = ():AdminApp => {
  logger.info(`*** IS PROD: ${isProduction()} ***`)
  const firebaseAdminApp = initializeApp()
  const storage = getStorage(firebaseAdminApp);
  const firestore = getFirestore(firebaseAdminApp);
  const auth = getAdminAuth(firebaseAdminApp);
  return {
    firebaseApp: () => firebaseAdminApp,
    firestore: () => firestore,
    storage: () => storage,
    auth: () => auth,
  }
}

export const buildClientApp = ():ClientApp => {
  const config = configRetriever.retrieve();
  const apiKey = config.firebaseApiKey()
  if (!apiKey) {
    throw new UnexpectedError("No firebase api key")
  }
  const clientApp = initClientApp({
    apiKey,
  });
  const auth = getAuth(clientApp);
  // const storage = getClientStorage(clientApp);
  if (!isProduction()) {
    logger.info("USING AUTH EMULATOR")
    connectAuthEmulator(auth, 'http://localhost:9099')
    // connectStorageEmulator(storage, 'localhost', 9199)
  }

  return {
    clientApp: () => clientApp,
    auth: () => ({
      firebaseAuth: () => auth,
      facebookCredential: accessToken => FacebookAuthProvider.credential(accessToken),
      createUserWithEmailAndPassword: (email, password) => createUserWithEmailAndPassword(auth, email, password),
      signInWithEmailAndPassword: (email, password) => signInWithEmailAndPassword(auth, email, password),
      signInWithCredential: credential => signInWithCredential(auth, credential),
      sendPasswordResetEmail: email => sendPasswordResetEmail(auth, email),
    }),
  }
}

export const buildPubSub = ():PubSub => {
  const pubSub = new GooglePubSub();
  return {
    pubSub: () => pubSub,
  }
}