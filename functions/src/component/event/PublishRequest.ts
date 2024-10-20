
export interface PublishRequest<T extends string, D> {
  topicName:T,
  data:D
}

export type DebugPublishRequest = PublishRequest<'debug-topic', any>