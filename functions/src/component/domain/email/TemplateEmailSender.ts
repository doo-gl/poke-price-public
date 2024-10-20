import {emailSender, SendTemplateEmailRequest} from "./EmailSender";
import {Template, TemplateMetadata, TemplateVariables} from "./Template";
import {emailAttemptCreator, EmailAttemptEntity, emailAttemptUpdater} from "./EmailAttemptEntity";
import {userRetriever} from "../user/UserRetriever";
import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {logger} from "firebase-functions";
import {emailAttemptRetriever} from "./EmailAttemptRetriever";
import {LoadingState} from "../../constants/LoadingState";

const getOrCreateAttempt = async <T extends Template<TemplateVariables, TemplateMetadata>>(
  key:string,
  userId:string,
  template:T
):Promise<EmailAttemptEntity> => {

  const user = await userRetriever.retrieve(userId);
  if (!user.details?.email) {
    throw new InvalidArgumentError(`User with id: ${userId} does not have an email`);
  }

  const preExistingAttempt = await emailAttemptRetriever.retrieveOptionalByKey(key);

  if (preExistingAttempt) {
    logger.info(`Pre-existing email attempt for key: ${key} already exists, not sending again.`)
    return preExistingAttempt;
  }

  const request:SendTemplateEmailRequest = {
    templateName: template.name,
    message: {
      fromEmail: 'info@pokeprice.io',
      subject: template.subject,
      to: [{
        userId,
        email: user.details.email,
      }],
      globalVariables: Object.entries(template.variables).map(entry => ({
        name: entry[0],
        content: entry[1],
      })),
    },
    metadata: template.metadata,
  }

  return await emailAttemptCreator.create({
    key,
    toUserIds: [userId],
    request,
    response: null,
    state: LoadingState.NOT_STARTED,
    error: null,
  })
}

const send = async <T extends Template<TemplateVariables, TemplateMetadata>>(
  key:string,
  userId:string,
  template:T
):Promise<EmailAttemptEntity> => {


  const attempt = await getOrCreateAttempt<T>(key, userId, template);

  if (attempt.state !== LoadingState.NOT_STARTED) {
    return attempt;
  }

  await emailAttemptUpdater.updateOnly(attempt.id, { state: LoadingState.IN_PROGRESS });

  try {

    logger.info(`Sending email with id: ${attempt.id}`)
    const response = await emailSender.sendTemplateEmail(attempt.request);
    logger.info(`Result of sending email with id: ${attempt.id} - ${response?.map(resp => resp.status)?.join(', ')}`)
    return await emailAttemptUpdater.updateAndReturn(attempt.id, { response: response ?? null, state: LoadingState.SUCCESSFUL })

  } catch (err:any) {

    const savableError = JSON.parse(JSON.stringify(err ?? {}))
    logger.error(`Failed to send email: ${attempt.id}, ${err.message}`, {error: savableError})
    return await emailAttemptUpdater.updateAndReturn(attempt.id, { error: savableError, state: LoadingState.FAILED })

  }
}

export const templateEmailSender = {
  send,
}