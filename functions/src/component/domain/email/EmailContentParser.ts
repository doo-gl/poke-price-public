import {Content} from "../card/PublicCardDto";

/*
if (!props.content) {
    return null;
  }
  if (typeof props.content === 'string') {
    return (
      <BodyTiny>
        {props.content}
      </BodyTiny>
    )
  }
  return (
    <React.Fragment>
      {props.content.map(cont => {
        switch (cont.type) {
          case "text":
            return (
              <BodyTiny key={uuid()}>
                {
                  typeof cont.children === 'string'
                    ? cont.children
                    : <JsonContent content={cont.children} />
                }
              </BodyTiny>
            )
          case "bold":
            return (
              <BodyTinyBold key={uuid()}>
                {
                  typeof cont.children === 'string'
                    ? cont.children
                    : <JsonContent content={cont.children} />
                }
              </BodyTinyBold>
            )
          case "paragraph":
            return (
              <BodyTiny key={uuid()} style={{ textAlign: 'center', marginVertical: Layout.spacing(0.5) }}>
                <JsonContent content={cont.children} />
              </BodyTiny>
            )
          case "section":
            return (
              <View key={uuid()} style={{marginVertical: Layout.spacing(2) }}>
                <JsonContent content={cont.children} />
              </View>
            )
          case "empty":
          default:
            return null;
        }
      })}
    </React.Fragment>
  )
 */

const parse = (contents:Array<Content>|string|null):string => {
  // Time Left: <strong>5d 3h 5m</strong>
  //                               <br>
  //                               Bids: <strong>10</strong>
  //                               <br>
  //                               Buy it now
  //                               <br>
  //                               Best offer
  //                               <br>

  if (!contents) {
    return ''
  }
  if (typeof contents === "string") {
    return contents
  }
  return contents.map<string>(content => {
    switch (content.type) {
      case "text":
        return typeof content.children === "string" ? content.children : parse(content.children);
      case "bold":
        return `<strong>${typeof content.children === "string" ? content.children : parse(content.children)}</strong>`;
      case "paragraph":
        return `${parse(content.children)}
        <br>`
      case "section":
        return `<div>
${parse(content.children)}
</div>`
      case "empty":
        return ''
    }
  })
    .join('')
}

export const emailContentParser = {
  parse,
}