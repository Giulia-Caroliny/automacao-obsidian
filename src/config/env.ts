import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY é obrigatória'),
  GEMINI_MODEL: z.string().default('gemini-3.5-flash-lite'),
  EMBEDDING_MODEL: z.string().default('text-embedding-004'),
  INBOX_PATH: z.string().default('/app/data/inbox'),
  PROCESSED_PATH: z.string().default('/app/data/processed'),
  VAULT_PATH: z.string().default('/app/data/vault'),
  LANCEDB_PATH: z.string().default('/app/data/lancedb'),
  TOP_K_NEIGHBORS: z
    .string()
    .default('10')
    .transform((val) => parseInt(val, 10)),
  CHOKIDAR_USEPOLLING: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
});

export const env = envSchema.parse(process.env);