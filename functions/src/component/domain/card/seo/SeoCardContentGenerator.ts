import {CardEntity} from "../CardEntity";
import {Content} from "../PublicCardDto";


const generate = (keywords:Array<string>, cards:Array<CardEntity>):Content => {

  return {
    type: "section",
    children: [
      {
        type: "paragraph",
        children: [
          {type: "text", children: `There are `},
          {type: "bold", children: `${cards.length}`},
          {type: "text", children: keywords.join(' ')},
        ],
      },
    ],
  }

}

export const seoCardContentGenerator = {
  generate,
}