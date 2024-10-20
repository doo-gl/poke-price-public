import {BaseError} from "./BaseError";
import {ErrorObject} from "ajv";


export class ValidationError extends BaseError {

  readonly details:ErrorObject[]|null|undefined;

  constructor(message:string, errors:ErrorObject[]|null|undefined) {
    super(message);
    this.details = errors;
  }
}