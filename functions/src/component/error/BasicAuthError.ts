import {BaseError} from "./BaseError";


export class BasicAuthError extends BaseError {
  constructor(message:string) {
    super(message);
  }
}