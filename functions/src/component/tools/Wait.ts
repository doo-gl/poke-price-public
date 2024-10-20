
export const wait = async (timeMillis:number) => {
  await new Promise<void>(resolve => {
    setTimeout(() => resolve(), timeMillis);
  })
}