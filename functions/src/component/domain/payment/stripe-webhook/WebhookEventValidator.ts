import {configRetriever} from "../../../infrastructure/ConfigRetriever";
import {getStripe} from "../../../external-lib/Stripe";
import {Stripe} from "stripe";
import {logger} from "firebase-functions";
import {InvalidArgumentError} from "../../../error/InvalidArgumentError";
import express from "express";
import {UnexpectedError} from "../../../error/UnexpectedError";

const validate = async (req:express.Request):Promise<Stripe.Event> => {
  const webhookSecret = configRetriever.retrieve().stripeWebhookSecret();
  if (!webhookSecret) {
    throw new UnexpectedError("No stripe webhook secret")
  }
  const signature = req.headers['stripe-signature'];
  if (!signature) {
    throw new InvalidArgumentError(`No signature provided`)
  }
  try {
    return await getStripe().webhooks.constructEvent(
      // the Request type is actually the firebase function request that extends express Request and adds rawBody
      // so the rawBody param is present, but the type system doesn't know about it
      // @ts-ignore
      req.rawBody,
      signature,
      webhookSecret
    );
  } catch (err:any) {
    logger.error(`Failed to validate webhook payload: ${err.message}`, err);
    throw new InvalidArgumentError(`Failed to validate signature`)
  }
}

export const webhookEventValidator = {
  validate,
}