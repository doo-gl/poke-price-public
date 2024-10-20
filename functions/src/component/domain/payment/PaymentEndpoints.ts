import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {NO_AUTHORIZATION} from "../../infrastructure/Authorization";
import {stripeWebhookProcessor} from "./stripe-webhook/StripeWebhookProcessor";
import {webhookEventValidator} from "./stripe-webhook/WebhookEventValidator";

export const StripeWebhook:Endpoint = {
  path: '',
  method: Method.POST,
  auth: NO_AUTHORIZATION,
  requestHandler: async (req, res, next) => {
    const event = await webhookEventValidator.validate(req);
    await stripeWebhookProcessor.processWebhook(event);
    return '';
  },
}