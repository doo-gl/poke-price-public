import {BaseError} from "./BaseError";


export class EbaySecurityMeasureError extends BaseError {
  constructor(message:string) {
    super(message);
  }
}