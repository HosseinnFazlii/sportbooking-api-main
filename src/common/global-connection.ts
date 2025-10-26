// globalConnection.ts

import { createConnection, Connection, getManager } from 'typeorm';
import { ormConfig } from '../config/ormconfig';

let connection: Connection;

export const getGlobalConnection = async (): Promise<Connection> => {
  if (!connection) {
    connection = await createConnection(ormConfig);
  }
  return connection;
};
