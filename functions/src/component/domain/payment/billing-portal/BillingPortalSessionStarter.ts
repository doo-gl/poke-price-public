import {getStripe} from "../../../external-lib/Stripe";
import {userContext} from "../../../infrastructure/UserContext";
import {customerGetserter} from "../customer/CustomerGetserter";

export interface BillingPortalSessionStartRequest {
  returnUrl:string
}

export interface BillingPortalSessionStartResponse {
  redirectUrl:string
}

const start = async (request:BillingPortalSessionStartRequest):Promise<BillingPortalSessionStartResponse> => {
  const user = userContext.getUserOrThrow()
  const stripeCustomerId = await customerGetserter.getOrInsertCustomerIdFromUser(user)
  const session = await getStripe().billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: request.returnUrl,
  });
  return {
    redirectUrl: session.url,
  };
}

export const billingPortalSessionStarter = {
  start,
}