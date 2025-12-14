import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema';
import { config } from './config';

const client = config.DATABASE_URL ? postgres(config.DATABASE_URL) : null;

export const db = client ? drizzle(client, { schema }) : (null as unknown as ReturnType<typeof drizzle>);
