
export type ContentType = 'heading1'|'heading2'|'section'|'paragraph'|'text'|'bold'|'empty'|'link'|'list'|'list-item';
export type ContentChildren = Array<Content|null>|Content|string|null

export interface Content {
  type:ContentType,
  children:ContentChildren,
  size?:'small'|'medium'|'large'
}

export interface LinkContent extends Content {
  type:'link',
  url:string,
}

export const content = (type:ContentType, children:ContentChildren, attr?:object):Content => {
  return {type, children, ...attr}
}

export const empty = ():Content => {
  return {type: "empty", children: null}
}

export const section = (cont:ContentChildren, attr?:object):Content => {
  return content('section', cont, attr)
}
export const paragraph = (cont:ContentChildren, attr?:object):Content => {
  return content('paragraph', cont, attr)
}
export const text = (cont:ContentChildren, attr?:object):Content => {
  return content('text', cont, attr)
}
export const bold = (cont:ContentChildren, attr?:object):Content => {
  return content('bold', cont, attr)
}
export const link = (cont:ContentChildren, url:string, attr?:object):Content => {
  return content('link', cont, {url, ...attr})
}
export const heading1 = (cont:ContentChildren, attr?:object):Content => {
  return content('heading1', cont, attr)
}
export const heading2 = (cont:ContentChildren, attr?:object):Content => {
  return content('heading2', cont, attr)
}
export const list = (cont:ContentChildren, attr?:object):Content => {
  return content('list', cont, attr)
}
export const listItem = (cont:ContentChildren, attr?:object):Content => {
  return content('list-item', cont, attr)
}
export const ifExists = <T>(maybeVal:T|null|undefined, map:(val:T) => Content|null):Content|null => {
  if (maybeVal === undefined || maybeVal === null) {
    return null;
  }
  return map(maybeVal)
}

export interface ContentItem {
  title:string,
  description:string,
  shortContent:Content,
  longContent:Content,
}