import {checkoutSessionRetriever} from "./CheckoutSessionRetriever";
import {userContext} from "../../../infrastructure/UserContext";
import {STRIPE_METADATA_USER_ID_KEY} from "./CheckoutSessionStarter";
import {NotFoundError} from "../../../error/NotFoundError";


export interface CheckoutSessionDto {
  checkoutSessionId:string,
  isPaid:boolean,
}

const retrieve = async (checkoutSessionId:string):Promise<CheckoutSessionDto> => {
  const session = await checkoutSessionRetriever.retrieveOptionalByStripeCheckoutSessionId(checkoutSessionId);
  if (!session) {
    throw new NotFoundError(`No session with id: ${checkoutSessionId} exists`);
  }
  const callingUser = userContext.getUser();
  const metadata = session.metadata ?? {}
  const metadataUserId = metadata[STRIPE_METADATA_USER_ID_KEY] ?? null
  if (!metadataUserId || !callingUser || callingUser.id !== metadataUserId) {
    // if a user the doesn't own the object tries to get it, they see nothing
    throw new NotFoundError(`No session with id: ${checkoutSessionId} exists`);
  }
  return {
    checkoutSessionId,
    isPaid: session.paymentStatus === "paid" || session.paymentStatus === "no_payment_required",
  }
}

export const checkoutSessionDtoRetriever = {
  retrieve,
}