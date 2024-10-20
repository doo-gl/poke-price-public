import {emailAttemptRetriever} from "../email/EmailAttemptRetriever";
import {PORTFOLIO_UPDATE_EMAIL_TEMPLATE_NAME} from "../email/Template";
import {PortfolioStatsEntity} from "./PortfolioStatsEntity";
import {userRetriever} from "../user/UserRetriever";
import {timestampToMoment} from "../../tools/TimeConverter";
import moment, {Moment} from "moment";
import {
  SEND_PORTFOLIO_UPDATE_EMAIL_TOPIC_NAME,
  SendPortfolioUpdateEmailRequest,
} from "../../event/SendPortfolioUpdateEmailTrigger";
import {scheduledEventRetriever} from "../../event/scheduled/ScheduledEventRetriever";
import {UserEntity} from "../user/UserEntity";
import {eventScheduler} from "../../event/scheduled/EventScheduler";
import {logger} from "firebase-functions";

const TIME_BETWEEN_EMAILS_IN_DAYS = 7

const calculateNextEmailTime = async (user:UserEntity, portfolioStats:PortfolioStatsEntity):Promise<Moment> => {

  const lastEmail = await emailAttemptRetriever.retrieveMostRecentSuccessfulEmailForUserByTemplateName(
    portfolioStats.userId,
    PORTFOLIO_UPDATE_EMAIL_TEMPLATE_NAME
  )

  if (!lastEmail) {
    const isNewUser = timestampToMoment(user.dateCreated).startOf('day')
      .isSame(moment().startOf('day'))
    return isNewUser
      ? moment().add(TIME_BETWEEN_EMAILS_IN_DAYS)
      : moment()
  }

  return timestampToMoment(lastEmail.dateCreated).add(TIME_BETWEEN_EMAILS_IN_DAYS, 'days')
}

const onPortfolioStatsUpdated = async (portfolioStats:PortfolioStatsEntity):Promise<void> => {

  const user = await userRetriever.retrieve(portfolioStats.userId)

  const nextEmailEvent = await scheduledEventRetriever.retrieveNextScheduledForUserIdInTopic(
    portfolioStats.userId,
    SEND_PORTFOLIO_UPDATE_EMAIL_TOPIC_NAME
  )

  if (nextEmailEvent) {
    logger.info(`Found next portfolio update email event for user: ${portfolioStats.userId}, not scheduling another.`)
    return
  }

  const nextEmailTime = await calculateNextEmailTime(user, portfolioStats)

  logger.info(`Scheduling portfolio update email for user: ${portfolioStats.userId}, at: ${nextEmailTime.toISOString()}`)
  await eventScheduler.schedule<'send-portfolio-update-email', SendPortfolioUpdateEmailRequest>(
    {
      topicName: "send-portfolio-update-email",
      data: {userId: portfolioStats.userId},
    },
    nextEmailTime,
    {}
  )
}

export const portfolioEmailScheduler = {
  onPortfolioStatsUpdated,
}