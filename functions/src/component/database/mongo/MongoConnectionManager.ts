import mongodb, {MongoClient} from 'mongodb';
import {configRetriever} from "../../infrastructure/ConfigRetriever";
import {logger} from "firebase-functions";
import moment from "moment/moment";
import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {UnexpectedError} from "../../error/UnexpectedError";

export interface Connection {
  db: mongodb.Db,
  client: MongoClient
}

let connection:Connection|null = null;
let connectPromise:Promise<Connection>|null = null;
let isConnectionFailed:boolean|null = null;

const buildConnectionString = () => {
  const config = configRetriever.retrieve()
  const mongoPort = config.mongoPort()
  if (mongoPort && mongoPort.length > 0) {
    return `mongodb://${config.mongoUser()}:${config.mongoPassword()}@${config.mongoHost()}:${mongoPort}/${config.mongoDatabase()}?authSource=${config.mongoAuthSource()}`;
  }
  return `mongodb+srv://${config.mongoUser()}:${config.mongoPassword()}@${config.mongoHost()}/${config.mongoDatabase()}?authSource=${config.mongoAuthSource()}`;
};

const doConnect = async ():Promise<Connection> => {
  if (connection) {
    return connection;
  }

  const config = configRetriever.retrieve()
  const connectionString = buildConnectionString();
  const startConnection = moment()
  const mongoClient = new MongoClient(connectionString)
  try {
    const client = await mongoClient.connect();
    const endConnection = moment()
    logger.info(`Connection to mongodb host: ${config.mongoHost()}, took: ${endConnection.diff(startConnection, 'milliseconds')}ms`);
    connection = {
      client,
      db: client.db(config.mongoDatabase()),
    }
    isConnectionFailed = false;
    return connection;
  } catch (err:any) {
    isConnectionFailed = true;
    logger.error(`Failed to connect to mongodb ${err.message}`, err);
    throw new UnexpectedError(`Failed to connect to database`)
  }
}

const connect = ():Promise<Connection> => {
  if (connectPromise && isConnectionFailed) {
    connectPromise = null;
    isConnectionFailed = null;
  }
  if (!connectPromise) {
    connectPromise = doConnect();
  }
  return connectPromise;
};

const getConnectionOrThrow = ():Connection => {
  if (!connection) {
    throw new InvalidArgumentError(`Mongo Connection is not initialised yet`)
  }
  return connection
};

const getConnection = async ():Promise<Connection> => {
  if (!connection) {
    return await connect();
  }
  return connection
}

const hasDatabaseConnection = ():boolean => {
  return !!connection?.db?.collection
};

export interface MongoConnectionManager {
  connect: () => Promise<Connection>,
  getConnection: () => Promise<Connection>,
  getConnectionOrThrow: () => Connection,
  hasDatabaseConnection: () => boolean
}

export const mongoConnectionManager:MongoConnectionManager = {
  connect,
  getConnection,
  getConnectionOrThrow,
  hasDatabaseConnection,
};