import {appHolder} from "../../infrastructure/AppHolder";
import {logger} from "firebase-functions";
import {SignInValidationError, SignInValidationErrorCode} from "../../error/SignInValidationError";
import {UnexpectedError} from "../../error/UnexpectedError";
import {SignUpValidationError, SignUpValidationErrorCode} from "../../error/SignUpValidationError";
import {UserCredential} from "../../external-lib/Firebase";


const logInWithFacebook = async (facebookAccessToken:string):Promise<UserCredential> => {
  try {
    const auth = appHolder.getClientApp().auth();
    const credential = auth.facebookCredential(facebookAccessToken);
    const userCredential = await auth.signInWithCredential(credential);
    return userCredential;
  } catch (err:any) {
    logger.error(`Failed to sign in`, err);
    if (err.code === 'auth/invalid-credential') {
      throw new SignInValidationError('Invalid credential', SignInValidationErrorCode.INVALID_CREDENTIAL);
    }
    if (err.code === 'auth/user-disabled') {
      throw new SignInValidationError('User has been disabled', SignInValidationErrorCode.USER_DISABLED);
    }
    if (err.code === 'auth/user-not-found') {
      throw new SignInValidationError('User does not exist', SignInValidationErrorCode.USER_NOT_FOUND);
    }
    if (err.code === 'auth/operation-not-allowed') {
      throw new SignInValidationError('Sign in method not allowed', SignInValidationErrorCode.SIGN_IN_METHOD_NOT_ALLOWED);
    }
    throw new UnexpectedError(`Something went wrong while attempting sign in`)
  }
}

const logInWithEmailAndPassword = async (email:string, password:string):Promise<UserCredential> => {
  try {
    const auth = appHolder.getClientApp().auth();
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    return userCredential;
  } catch (err:any) {
    logger.error(`Failed to sign in`, err);
    if (err.code === 'auth/invalid-email') {
      throw new SignInValidationError('Invalid email', SignInValidationErrorCode.EMAIL_NOT_VALID);
    }
    if (err.code === 'auth/user-disabled') {
      throw new SignInValidationError('User has been disabled', SignInValidationErrorCode.USER_DISABLED);
    }
    if (err.code === 'auth/user-not-found') {
      throw new SignInValidationError('User does not exist', SignInValidationErrorCode.USER_NOT_FOUND);
    }
    if (err.code === 'auth/wrong-password') {
      throw new SignInValidationError('Incorrect password', SignInValidationErrorCode.WRONG_PASSWORD);
    }
    throw new UnexpectedError(`Something went wrong while attempting sign in`)
  }
}

const signUpWithEmailAndPassword = async (email:string, password:string):Promise<UserCredential> => {
  const auth = appHolder.getClientApp().auth();
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    return userCredential;
  } catch (err:any) {
    logger.error(`Failure while trying to create user`, err)
    if (err.code === 'auth/email-already-in-use') {
      throw new SignUpValidationError(`Email already in use`, SignUpValidationErrorCode.EMAIL_ALREADY_IN_USE);
    } else if (err.code === 'auth/invalid-email') {
      throw new SignUpValidationError(`Email is not a valid email address`, SignUpValidationErrorCode.EMAIL_NOT_VALID)
    } else if (err.code === 'auth/operation-not-allowed') {
      throw new UnexpectedError(`Sign up via email is not allowed`)
    } else if (err.code === 'auth/weak-password') {
      throw new SignUpValidationError(`Password is too weak`, SignUpValidationErrorCode.WEAK_PASSWORD)
    }
    throw new UnexpectedError(`Something went wrong while signing up`)
  }
}

export const firebaseLogInManager = {
  logInWithFacebook,
  logInWithEmailAndPassword,
  signUpWithEmailAndPassword,
}