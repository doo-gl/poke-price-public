import {BaseCrudRepository} from "./BaseCrudRepository";
import {Entity} from "./Entity";
import {NotFoundError} from "../error/NotFoundError";


const update = async <T extends Entity>(repo:BaseCrudRepository<T>, dataName:string, id:string, updateEntity:Partial<T>):Promise<T> => {
  const updatedEntity:T|null = await repo.updateOne(id, updateEntity);
  if (!updatedEntity) {
    throw new NotFoundError(`Failed to update ${dataName} with id: ${id}, not found.`)
  }
  return updatedEntity;
}

export const byIdUpdater = {
  update,
}