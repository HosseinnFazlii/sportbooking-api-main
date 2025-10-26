// src/common/global-connection.ts

import { DataSource } from 'typeorm';
import { ormConfig } from '../config/ormconfig';

// We'll keep a single DataSource instance for the whole app.
let dataSource: DataSource | null = null;

/**
 * Return a singleton DataSource for places in the codebase
 * that still expect to grab a "global connection".
 *
 * In NestJS you usually inject repositories instead of calling this,
 * but some helpers/utilities may still call it directly.
 */
export const getGlobalConnection = async (): Promise<DataSource> => {
  // If already initialized, just reuse it
  if (dataSource && dataSource.isInitialized) {
    return dataSource;
  }

  // Create a new DataSource using our ormConfig.
  // ormConfig is very close to DataSourceOptions, so we cast.
  dataSource = new DataSource(ormConfig as any);

  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  return dataSource;
};
