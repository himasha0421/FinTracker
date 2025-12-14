import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().optional(),
    STORAGE_TYPE: z.enum(['postgres', 'memory']).default('memory'),
  })
  .superRefine((value, ctx) => {
    if (value.STORAGE_TYPE === 'postgres' && !value.DATABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'DATABASE_URL is required when STORAGE_TYPE=postgres',
        path: ['DATABASE_URL'],
      });
    }
  });

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(parsed.error.message);
}

export const config = parsed.data;
export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';
