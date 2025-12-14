import { config } from '../config';
import { MemoryStorage } from './memory';
import { PostgresStorage } from './postgres';
import { logger } from '../logger';
import type { IStorage } from './types';

const storageImpl: IStorage =
  config.STORAGE_TYPE === 'postgres' ? new PostgresStorage() : new MemoryStorage();

logger.info(`Using ${config.STORAGE_TYPE === 'postgres' ? 'PostgreSQL' : 'in-memory'} storage`);

export const storage = storageImpl;
export type { IStorage } from './types';
