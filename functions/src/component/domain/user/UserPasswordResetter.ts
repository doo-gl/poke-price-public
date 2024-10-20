import {ResetPasswordBody} from "../webapp/UserWebappEndpoints";
import {userRetriever} from "./UserRetriever";
import {appHolder} from "../../infrastructure/AppHolder";
import {logger} from "firebase-functions";


const reset = async (request:ResetPasswordBody):Promise<void> => {
  const user = await userRetriever.retrieveByEmail(request.email);
  if (!user) {
    return;
  }
  try {
    const auth = appHolder.getClientApp().auth();
    await auth.sendPasswordResetEmail(request.email)
  } catch (err:any) {
    logger.error(`Failed to reset password for user: ${user.id}, ${err.message}`, err)
  }
}

export const userPasswordResetter = {
  reset,
}