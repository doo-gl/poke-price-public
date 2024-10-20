import {CodedError} from "./CodedError";


export enum SignInValidationErrorCode {
  WRONG_PASSWORD = 'WRONG_PASSWORD',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_NOT_VALID = 'EMAIL_NOT_VALID',
  USER_DISABLED = 'USER_DISABLED',
  INVALID_CREDENTIAL = 'INVALID_CREDENTIAL',
  SIGN_IN_METHOD_NOT_ALLOWED = 'SIGN_IN_METHOD_NOT_ALLOWED',
}

export class SignInValidationError extends CodedError {
  constructor(message:string, code:SignInValidationErrorCode) {
    super(message, code);
  }
}