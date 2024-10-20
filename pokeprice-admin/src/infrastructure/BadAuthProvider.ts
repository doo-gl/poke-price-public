import { AuthProvider } from 'react-admin';

const USERNAME = 'jaffa_cakes';
const PASSWORD = 'lime_fort';
const sessionStorage:Storage = window.sessionStorage;

export const badAuthProvider:AuthProvider = {
  login: params => {
    if (params.username === USERNAME && params.password === PASSWORD) {
      sessionStorage.setItem('isAuthenticated', 'true');
      return Promise.resolve();
    } else {
      return Promise.reject()
    }
  },
  logout: params => {
    return Promise.resolve();
  },
  checkAuth: params => {
    const isAuthenticated = sessionStorage.getItem('isAuthenticated');
    if (isAuthenticated) {
      return Promise.resolve();
    } else {
      return Promise.reject();
    }
  },
  checkError: error => {
    return Promise.resolve();
  },
  getIdentity: () => {
    return Promise.resolve({ id: 'id' });
  },
  getPermissions: params => {
    return Promise.resolve();
  }
}