

export interface PublicNewsDto {
  newsId:string,
  date:string,
  title:string,
  description:string,
  imageUrl:string,
  backgroundImageUrl:string|null,
  category:string,
  newsLink:string,
}

export interface PublicNewsListDto {
  results:Array<PublicNewsDto>,
}