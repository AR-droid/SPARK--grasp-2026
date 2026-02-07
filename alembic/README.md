# Alembic Migrations

Run:

- `alembic revision --autogenerate -m "baseline"`
- `alembic upgrade head`

Ensure `.env` has `DATABASE_URL` set to Supabase.
