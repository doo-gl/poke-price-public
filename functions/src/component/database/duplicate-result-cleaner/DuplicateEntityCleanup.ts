import {duplicateResultRepository} from "./DuplicateResultRepository";


const cleanUp = async (numberToClean = 100) => {

  const entities = await duplicateResultRepository.getMany(
    []
  )

}

export const duplicateEntityCleanup = {
  cleanUp,
}