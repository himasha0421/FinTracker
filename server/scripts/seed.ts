import { storage } from '../storage';
import { seedStorage } from '../storage/seeds';
import { logger } from '../logger';

async function main() {
  await seedStorage(storage);
  logger.info('Seed data applied');
}

main().catch(error => {
  logger.error({ err: error }, 'Failed to seed data');
  process.exit(1);
});
