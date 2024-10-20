import {AuthProvider, UserIdentity} from 'react-admin';
import {firebaseApp} from "./FirebaseApp";
import firebase from "firebase";

const login = async (params: { username: string; password: string }):Promise<any> => {
  const { username, password } = params;

  if (username && password) {
    try {
      const user = await firebaseApp.auth().signInWithEmailAndPassword(
        username,
        password
      );
      return user;
    } catch (e) {
      throw new Error('Login error: invalid credentials');
    }
  } else {
    return getUserLogin();
  }
}

const getUserLogin = ():Promise<firebase.User> => {
  return new Promise((resolve, reject) => {
    const currentUser = firebaseApp.auth().currentUser;
    if (currentUser) {
      return resolve(currentUser);
    }
    const unsubscribe = firebaseApp.auth().onAuthStateChanged((user) => {
      unsubscribe();
      if (user) {
        resolve(user);
      } else {
        reject();
      }
    });
  });
}

const logout = ():Promise<void> => {
  return firebaseApp.auth().signOut();
}

const checkAuth = ():Promise<void> => {
  return getUserLogin() as any;
}

const checkError = (error:any):Promise<void> => {
  console.error(`Auth error`, error)
  return Promise.reject();
}

const getIdentity = async ():Promise<UserIdentity> => {
  try {
    const { uid, email, photoURL } = await getUserLogin();
    const identity = {
      id: uid,
      fullName: email + '',
      avatar: photoURL + '',
    };
    return identity;
  } catch (e) {
    console.error(`User not logged in`, e)
  }
  return null as any;
}

const getPermissions = async ():Promise<any> => {
  try {
    const user = await getUserLogin();
    const token = await user.getIdTokenResult();
    return token.claims;
  } catch (e) {
    console.error(`User not logged in`, e)
    return null;
  }
}

const getToken = async ():Promise<string|null> => {
  try {
    const user = await getUserLogin();
    const token = await user.getIdToken();
    return token;
  } catch (e) {
    console.error(`User not logged in`, e)
    return null;
  }
}

export interface FirebaseAuthProvider extends AuthProvider {
  getToken:() => Promise<string|null>,
}

export const firebaseAuthProvider:FirebaseAuthProvider = {
  login,
  logout,
  checkAuth,
  checkError,
  getIdentity,
  getPermissions,
  getToken,
}