

// want to write a job that every hour wakes up and looks through all the sets available
// on the tcg api, and compares against the sets that we currently have
// if there are sets we do not have, add them
// need to figure out whether to add them with reverse holos
// also need to figure out how to map them against other sources
// like tcg collector / collectr / tcg player

// for the first round, only automatically source sets that have a matching config
// config is hard coded
// allows you to set up config in advance and then leave it running

// eventually, you can write something to create this config automatically

const source = async () => {

  // read sets from tcg api
  // read sets from our DB
  // find missing sets
  // for each missing set, try to source
  // source the first set that has a config entry

}

export const automatedSetSourcer = {
  source,
}