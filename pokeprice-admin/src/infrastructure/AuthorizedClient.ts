import axios, {AxiosResponse} from "axios";
import {firebaseAuthProvider} from "./FirebaseAuthProvider";


const get = async <T>(url:string):Promise<AxiosResponse<T>> => {
  const token = await firebaseAuthProvider.getToken();
  if (!token) {
    throw new Error(`No token for user`);
  }
  return axios.get<T>(
    url,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    }
  );
}

const put = async <T>(url:string, body:any):Promise<AxiosResponse<T>> => {
  const token = await firebaseAuthProvider.getToken();
  if (!token) {
    throw new Error(`No token for user`);
  }
  return axios.put<T>(
    url,
    body,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    }
  );
}

const post = async <T>(url:string, body:any):Promise<AxiosResponse<T>> => {
  const token = await firebaseAuthProvider.getToken();
  if (!token) {
    throw new Error(`No token for user`);
  }
  return axios.post<T>(
    url,
    body,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    }
  );
}

export const authorizedClient = {
  get,
  put,
  post,
}