import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY é obrigatória'),
  GEMINI_MODEL: z.string().default('gemini-3.5-flash-lite'),
  INBOX_PATH: z.string().default('/app/data/inbox'),
  PROCESSED_PATH: z.string().default('/app/data/processed'),
  VAULT_PATH: z.string().default('/app/data/vault')
});

export const env = envSchema.parse(process.env);