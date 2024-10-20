

export interface SetMappingConfig {
  pokemonTcgApi:{setId:string},
  tcgPlayer:{series:string, set:string},
  tcgCollector:{series:string, set:string},
}

export const SET_MAPPING_CONFIGS = new Array<SetMappingConfig>(
  {
    pokemonTcgApi: {setId:''},
    tcgPlayer: {series:'', set:''},
    tcgCollector: {series:'', set:''},
  },

)