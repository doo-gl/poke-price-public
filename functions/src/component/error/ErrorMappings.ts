import {errorToHttpResponseHandler, mapTypeToStatus} from "../infrastructure/express/ErrorToHttpResponseHandler";
import {NotFoundError} from "./NotFoundError";
import {InvalidArgumentError} from "./InvalidArgumentError";
import {UnexpectedError} from "./UnexpectedError";
import {ValidationError} from "./ValidationError";
import {BasicAuthError} from "./BasicAuthError";
import {NotAuthorizedError} from "./NotAuthorizedError";
import {SignUpValidationError} from "./SignUpValidationError";
import {SignInValidationError} from "./SignInValidationError";


const init = () => {
  errorToHttpResponseHandler.registerErrorMapper(mapTypeToStatus(BasicAuthError, 401));
  errorToHttpResponseHandler.registerErrorMapper(mapTypeToStatus(NotFoundError, 404));
  errorToHttpResponseHandler.registerErrorMapper(mapTypeToStatus(InvalidArgumentError, 400));
  errorToHttpResponseHandler.registerErrorMapper(mapTypeToStatus(SignUpValidationError, 400));
  errorToHttpResponseHandler.registerErrorMapper(mapTypeToStatus(SignInValidationError, 400));
  errorToHttpResponseHandler.registerErrorMapper(mapTypeToStatus(NotAuthorizedError, 401));
  errorToHttpResponseHandler.registerErrorMapper(mapTypeToStatus(ValidationError, 400));
  errorToHttpResponseHandler.registerErrorMapper(mapTypeToStatus(UnexpectedError, 500));
}

export const errorMappings = {
  init,
}