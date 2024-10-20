
const integer = (fromInclusive = 0, toExclusive = 1):number => {
  return Math.floor(Math.random() * (toExclusive - fromInclusive) + fromInclusive);
}

export const Random = {
  integer,
}