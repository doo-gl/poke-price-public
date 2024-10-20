import cls from "cls-hooked";
import {RequestHandler} from "./express/RequestHandler";
import {AdminUserEntity} from "../domain/admin/admin-user/AdminUserEntity";
import {UserEntity} from "../domain/user/UserEntity";
import {NotAuthorizedError} from "../error/NotAuthorizedError";


const namespace:cls.Namespace = cls.createNamespace("authorized-user");
const ADMIN_KEY = 'ADMIN_USER';
const USER_KEY = 'USER';

const setAdminUser = (adminUser:AdminUserEntity) => {
  namespace.set<AdminUserEntity>(ADMIN_KEY, adminUser);
}

const getAdminUser = ():AdminUserEntity|null => {
  return namespace.get(ADMIN_KEY);
}

const setUser = (user:UserEntity) => {
  namespace.set<UserEntity>(USER_KEY, user);
}

const getUser = ():UserEntity|null => {
  return namespace.get(USER_KEY);
}

const getUserOrThrow = ():UserEntity => {
  const user = getUser();
  if (!user) {
    throw new NotAuthorizedError(`No user provided`);
  }
  return user;
}

const middleware:RequestHandler = (req, res, next) => {
  namespace.run(() => {
    next();
  });
}

export const userContext = {
  setAdminUser,
  getAdminUser,
  setUser,
  getUser,
  getUserOrThrow,
  middleware,
}