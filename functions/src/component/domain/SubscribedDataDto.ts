


export interface SubscribedDataDto<S, P> {
  isSubscribed:boolean,
  subscribedData:S|null,
  nonSubscribedData:P|null,
}