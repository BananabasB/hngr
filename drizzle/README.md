Idempotent Migrations
- This repository's drizzle migrations are designed to be safe to re-run. If a migration has already been applied (tracked in __drizzle_migrations), drizzle-kit will skip it.
- If you encounter issues running migrations in a dirty environment, ensure the drizzle schema and __drizzle_migrations exist and are left intact; rerunning will only apply pending migrations.
