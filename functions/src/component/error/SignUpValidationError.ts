import {CodedError} from "./CodedError";

export enum SignUpValidationErrorCode {
  NOT_ACCEPTED_TERMS = 'NOT_ACCEPTED_TERMS',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  EMAIL_NOT_VALID = 'EMAIL_NOT_VALID',
  EMAIL_ALREADY_IN_USE = 'EMAIL_ALREADY_IN_USE',
}

export class SignUpValidationError extends CodedError {
  constructor(message:string, code:SignUpValidationErrorCode) {
    super(message, code);
  }
}