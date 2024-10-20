
import escape from 'escape-string-regexp';

export const escapeStringRegex = {
  escape: (value:string):string => {
    return escape(value)
  },
}