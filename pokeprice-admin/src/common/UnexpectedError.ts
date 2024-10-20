
import {BaseError} from "./BaseError";


export class UnexpectedError extends BaseError {
  constructor(message:string) {
    super(message);
  }
}