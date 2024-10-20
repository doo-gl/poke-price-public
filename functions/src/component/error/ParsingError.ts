import {BaseError} from "./BaseError";


export class ParsingError extends BaseError {
  constructor(message:string) {
    super(message);
  }
}