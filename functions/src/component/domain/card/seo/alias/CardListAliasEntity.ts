import {Create, Entity, Update} from "../../../../database/Entity";
import {repositoryFactory} from "../../../../database/RepositoryFactory";
import {JSONSchemaType} from "ajv";
import {CreateCardListAliasRequest} from "../../../admin/AdminCardListAliasEndpoints";

const COLLECTION_NAME = 'card-list-alias'

export interface CardListAliasEntity extends Entity {
  canonicalSlug:string
  aliasSlug:string,
  title:string|null,
  description:string|null,
  imageUrls:Array<string>|null,
}

const result = repositoryFactory.build<CardListAliasEntity>(COLLECTION_NAME);
export const cardListAliasRepository = result.repository;
export const cardListAliasCreator = result.creator;
export const cardListAliasUpdater = result.updater;
export const cardListAliasDeleter = result.deleter;

export const createCardListAliasSchema:JSONSchemaType<Create<CardListAliasEntity>> = {
  type: "object",
  properties: {
    canonicalSlug: { type: "string"},
    aliasSlug: { type: "string"},
    title: { type: "string", nullable: true},
    description: { type: "string", nullable: true},
    imageUrls: { type: "array", items: { type: "string" }, nullable: true },
  },
  additionalProperties: false,
  required: ["canonicalSlug", "aliasSlug", "title", "description", "imageUrls"],
}
export const updateCardListAliasSchema:JSONSchemaType<Update<CardListAliasEntity>> = {
  type: "object",
  properties: {
    canonicalSlug: { type: "string", nullable: true },
    aliasSlug: { type: "string", nullable: true },
    title: { type: "string", nullable: true },
    description: { type: "string", nullable: true },
    imageUrls: { type: "array", items: { type: "string" }, nullable: true },
  },
  additionalProperties: false,
  required: [],
}