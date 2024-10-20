import {BaseError} from "./BaseError";


export class CodedError extends BaseError {
  constructor(
    message:string,
    readonly errorCode:string
  ) {
    super(message);

  }
}