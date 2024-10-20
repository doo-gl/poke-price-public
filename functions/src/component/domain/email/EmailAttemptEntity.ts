import {Entity} from "../../database/Entity";
import {SendTemplateEmailRequest, SendTemplateResponse} from "./EmailSender";
import {repositoryFactory} from "../../database/RepositoryFactory";
import {LoadingState} from "../../constants/LoadingState";

const COLLECTION_NAME = 'email-attempt'

export interface EmailAttemptEntity extends Entity {
  key:string
  toUserIds:Array<string>,
  request:SendTemplateEmailRequest
  response:Array<SendTemplateResponse>|null
  state:LoadingState,
  error:any,
}

const result = repositoryFactory.build<EmailAttemptEntity>(COLLECTION_NAME);
export const emailAttemptRepository = result.repository;
export const emailAttemptCreator = result.creator;
export const emailAttemptUpdater = result.updater;
export const emailAttemptDeleter = result.deleter;