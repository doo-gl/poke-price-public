import {singleResultRepoQuerier} from "../../database/SingleResultRepoQuerier";
import {EmailAttemptEntity, emailAttemptRepository} from "./EmailAttemptEntity";
import {SortOrder} from "../../database/BaseCrudRepository";
import {LoadingState} from "../../constants/LoadingState";


const retrieveOptionalByKey = (key:string) => {
  return singleResultRepoQuerier.query(
    emailAttemptRepository,
    [{ name: "key", value: key }],
    emailAttemptRepository.collectionName,
  )
}

const retrieveMostRecentSuccessfulEmailForUserByTemplateName = async (userId:string, templateName:string):Promise<EmailAttemptEntity|null> => {
  const emailAttempts = await emailAttemptRepository.getMany(
    [
      { field: "request.metadata.userId", operation: "==", value: userId },
      { field: "request.templateName", operation: "==", value: templateName },
      { field: "state", operation: "==", value: LoadingState.SUCCESSFUL },
    ],
    {
      limit: 1,
      sort: [ { field: "dateCreated", order: SortOrder.DESC } ],
    }
  )
  if (emailAttempts.length === 0) {
    return null
  }
  return emailAttempts[0]
}

const retrieveByToUserId = (userId:string):Promise<Array<EmailAttemptEntity>> => {
  return emailAttemptRepository.getMany([
    {field: "toUserIds", operation: "array-contains", value: userId},
  ])
}

export const emailAttemptRetriever = {
  retrieveOptionalByKey,
  retrieveMostRecentSuccessfulEmailForUserByTemplateName,
  retrieveByToUserId,
}