import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {ALLOW_ALL, USER_AUTH, WEBAPP_ALLOW_ALL, WEBAPP_USER_AUTH} from "../../infrastructure/Authorization";
import {productDtoRetriever} from "../payment/product/ProductDtoRetriever";
import {checkoutSessionStarter, CheckoutSessionStartRequest} from "../payment/checkout-session/CheckoutSessionStarter";
import {JSONSchemaType} from "ajv";
import {jsonValidator} from "../../tools/JsonValidator";
import {checkoutSessionDtoRetriever} from "../payment/checkout-session/CheckoutSessionDtoRetriever";
import {
  billingPortalSessionStarter,
  BillingPortalSessionStartRequest,
} from "../payment/billing-portal/BillingPortalSessionStarter";

export const API_ROOT = '/payment';

export const GetProducts:Endpoint = {
  path: `${API_ROOT}/product`,
  method: Method.GET,
  auth: WEBAPP_ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    return {
      results: await productDtoRetriever.retrieve(),
    }
  },
}

const startCheckoutSessionSchema:JSONSchemaType<CheckoutSessionStartRequest> = {
  type: "object",
  properties: {
    priceId: { type: "string" },
    successUrl: { type: "string" },
    cancelUrl: { type: "string" },
  },
  additionalProperties: false,
  required: ["priceId", "successUrl", "cancelUrl"],
}
export const StartCheckoutSession:Endpoint = {
  path: `${API_ROOT}/checkout-session`,
  method: Method.POST,
  auth: WEBAPP_USER_AUTH,
  requestHandler: async (req, res, next) => {
    const request = jsonValidator.validate(req.body, startCheckoutSessionSchema);
    return checkoutSessionStarter.start(request)
  },
}

export const GetCheckoutSession:Endpoint = {
  path: `${API_ROOT}/checkout-session/:sessionId`,
  method: Method.GET,
  auth: WEBAPP_USER_AUTH,
  requestHandler: async (req, res, next) => {
    const sessionId = req.params['sessionId']
    return checkoutSessionDtoRetriever.retrieve(sessionId);
  },
}

const startBillingSessionSchema:JSONSchemaType<BillingPortalSessionStartRequest> = {
  type: "object",
  properties: {
    returnUrl: { type: "string" },
  },
  additionalProperties: false,
  required: ["returnUrl"],
}
export const StartBillingPortalSession:Endpoint = {
  path: `${API_ROOT}/billing-portal-session`,
  method: Method.POST,
  auth: WEBAPP_USER_AUTH,
  requestHandler: async (req, res, next) => {
    const request = jsonValidator.validate(req.body, startBillingSessionSchema);
    return billingPortalSessionStarter.start(request)
  },
}