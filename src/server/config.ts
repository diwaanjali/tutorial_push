import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash')
});

export type ServerConfig = z.infer<typeof envSchema>;

export function loadConfig(): ServerConfig {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment configuration:', parsed.error.format());
    process.exit(1);
  }
  return parsed.data;
}

export const config = loadConfig();
