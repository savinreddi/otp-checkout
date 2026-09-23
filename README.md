# OTP-Based User Login

A checkout demo with two flows: registration (issues a one-time 6-digit code)
and checkout with background email recognition + login-by-code.

## Architecture

Three distinct layers:

| Layer    | Tech                        | Location    |
|----------|------------------------------|-------------|
| Frontend | React + TypeScript (Vite)   | `frontend/` |
| API      | Go (standard library only, plus `lib/pq`) | `backend/`  |
| Database | PostgreSQL                  | `db/schema.sql` |

```
frontend (React SPA)  --HTTP JSON-->  backend (Go API)  --SQL-->  Postgres
```

### API endpoints

| Method | Path                | Purpose                                            |
|--------|----------------------|-----------------------------------------------------|
| POST   | `/api/register`      | Create a user, return their generated 6-digit code |
| GET    | `/api/users/check?email=` | Recognition check: is this email registered?  |
| POST   | `/api/login`          | Verify a submitted code against the stored one     |
| POST   | `/api/checkout`       | Record a checkout submission (no payment processing) |

### Database schema

See [`db/schema.sql`](./db/schema.sql). Two tables:

- `users` — email, first/last name, the issued OTP code.
- `checkout_submissions` — one row per placed order, optionally linked to a
  `users.id` when the shopper logged in.

## Running locally

### 1. Database

Create a Postgres database (local `postgres`, Docker, or a free Supabase
project) and load the schema:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

For PowerShell, set the connection string in the current terminal before
starting the API:

```powershell
$env:DATABASE_URL = "postgres://postgres:postgres@localhost:5432/otp_checkout?sslmode=disable"
```

The Go API reads environment variables directly; it does not load a `.env`
file automatically. The `.env.example` file is a reference for values to set
in your shell or hosting provider.

### 2. Backend

```bash
cd backend
go mod tidy
go run .
```

The API listens on `:8080` by default.

### 3. Frontend

```bash
cd frontend
cp .env.example .env   # VITE_API_URL=http://localhost:8080
npm install
npm run dev
```

Visit the printed local URL (typically `http://localhost:5173`).

## Deploying

This app is designed for free-tier hosting:

- **Database**: [Supabase](https://supabase.com) — create a project, run
  `db/schema.sql` in the SQL editor, copy the connection string into
  `DATABASE_URL`.
- **Backend**: any host that runs a Go binary from a Dockerfile or buildpack
  (e.g. Render, Fly.io, Railway free tier). Set `DATABASE_URL`, `PORT`
  (if required by the host), and `ALLOWED_ORIGIN` (your deployed frontend URL)
  as environment variables.
- **Frontend**: [Vercel](https://vercel.com) — import the `frontend/`
  directory as the project root, set `VITE_API_URL` to your deployed backend
  URL, and deploy.

## Notes on the flows

- **Registration**: the generated code is only ever shown on-screen at
  registration time (per the spec — no email/SMS delivery is required). It is
  stored in plaintext in `users.otp_code` for simplicity; a production system
  would hash it and add expiry/rate limiting.
- **Checkout recognition**: the email field is validated client-side against
  a standard email regex as the user types. Once it looks complete, a
  debounced (500ms) background call to `/api/users/check` runs while the user
  keeps filling out the rest of the form. If it matches a registered user, a
  modal prompts for the code; "Skip" dismisses it and the user continues as a
  guest without re-triggering for the same email.
- **No payment processing**: submitting checkout only inserts a row into
  `checkout_submissions`.
