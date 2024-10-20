import {itemRepository, itemUpdater} from "../../domain/item/ItemEntity";
import {toCard} from "../../domain/item/CardItem";
import {pokemonNameExtractor} from "../../domain/pokemon-tcg-api-v2/PokemonNameExtractor";


const run = async () => {
  await itemRepository.iterator()
    .iterate(async item => {
      const card = toCard(item)
      if (!card) {
        return
      }
      const isPokemon = card.superType === "pokémon"
      if (!isPokemon) {
        return
      }
      const extractedPokemonNames = pokemonNameExtractor.extract(item.name)

      const cardPokemon = card.pokemon.sort().join(",")
      const newPokemon = extractedPokemonNames.sort().join(",")
      if (cardPokemon !== newPokemon) {
        await itemUpdater.updateOnly(item._id, {itemDetails: {
            ...item.itemDetails,
            pokemon: extractedPokemonNames,
          }})
      }
    })
}