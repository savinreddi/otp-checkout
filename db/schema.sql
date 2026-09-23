-- OTP-based user login + checkout demo
-- Run against a fresh Postgres database (e.g. Supabase's SQL editor, or `psql -f schema.sql`).

CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    email       TEXT NOT NULL UNIQUE,
    first_name  TEXT NOT NULL,
    last_name   TEXT NOT NULL,
    otp_code    CHAR(6) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE TABLE IF NOT EXISTS checkout_submissions (
    id                 SERIAL PRIMARY KEY,
    user_id            INTEGER REFERENCES users (id) ON DELETE SET NULL,
    email              TEXT NOT NULL,
    phone              TEXT NOT NULL,
    shipping_address   TEXT NOT NULL,
    logged_in          BOOLEAN NOT NULL DEFAULT false,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkout_email ON checkout_submissions (email);
