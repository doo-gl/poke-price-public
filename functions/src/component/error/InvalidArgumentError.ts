import {BaseError} from "./BaseError";


export class InvalidArgumentError extends BaseError {
  constructor(message:string) {
    super(message);
  }
}