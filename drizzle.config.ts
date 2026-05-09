import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export default defineConfig({
  
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? 'postgres://localhost:5432/postgres',
    ssl: true,
  },
  // Idempotent migrations: drizzle-kit handles applied migrations via __drizzle_migrations.
  // This comment acts as a reminder for future changes; no runtime change required here.
});
