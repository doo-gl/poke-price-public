import {PublishRequest} from "./PublishRequest";

import {eventCallback, EventTriggerCallback} from "./EventTriggerBuilder";
import {portfolioUpdateEmailSender} from "../domain/email/portfolio-update/PortfolioUpdateEmailSender";
import {JSONSchemaType} from "ajv";

export interface SendPortfolioUpdateEmailRequest {
  userId:string
}
export const sendPortfolioUpdateEmailSchema:JSONSchemaType<SendPortfolioUpdateEmailRequest> = {
  type: "object",
  properties: {
    userId: { type: "string" },
  },
  additionalProperties: false,
  required: ["userId"],
}

export const SEND_PORTFOLIO_UPDATE_EMAIL_TOPIC_NAME = 'send-portfolio-update-email'
export type SendPortfolioUpdateEmailPublishRequest = PublishRequest<'send-portfolio-update-email', SendPortfolioUpdateEmailRequest>

export const SendPortfolioUpdateEmailTrigger:EventTriggerCallback = eventCallback(
  async eventPayload => {
    await portfolioUpdateEmailSender.send(eventPayload.userId)
  },
  sendPortfolioUpdateEmailSchema
)