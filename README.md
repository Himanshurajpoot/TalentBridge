# TalentBridge

TalentBridge is a two-sided freelance and hiring platform. Clients can publish
projects and jobs, review proposals and applications, and manage contracts.
Freelancers can find work, submit proposals and applications, maintain a
profile, and communicate with clients.

## Features

- Client and freelancer registration with role-specific workflows.
- Projects, proposals, proposal decisions, and contract creation.
- Company-backed job listings, applications, and application status updates.
- Contract work submission and client approval.
- Contract payment orders and verification through Razorpay (test mode for
  development).
- Authenticated real-time conversations and notifications using Socket.IO.
- Profiles with photos, skills, portfolio projects, ratings, and reviews.

Public registration supports `client` and `freelancer`; admin registration is
not available.

## Technology

- Frontend: React 19, Vite 8, React Router 7, Tailwind CSS 4, Axios,
  Socket.IO client.
- Backend: Node.js, Express 5, PostgreSQL (`pg`), Socket.IO, JWT, bcrypt,
  Razorpay SDK.
- Tests: Jest and Supertest.

## Architecture

The React single-page application calls the Express JSON API. In development,
Vite proxies `/api` requests to the local backend. The backend uses PostgreSQL
for application data and hosts the authenticated Socket.IO server alongside
the HTTP API. The browser sends the JWT in API requests and in the Socket.IO
handshake. Razorpay checkout is initiated in the browser with a public key ID;
payment state is verified by the backend.

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md),
[docs/API.md](./docs/API.md), and
[docs/PAYMENTS.md](./docs/PAYMENTS.md) for details.

## Repository structure

```text
backend/
  migrations/       Incremental SQL migrations
  src/controllers/  API handlers
  src/routes/       Express route definitions
  src/services/     Notification and Razorpay services
  tests/            Jest/Supertest tests
  server.js         HTTP and Socket.IO server
frontend/
  src/pages/        Application pages
  src/components/   Shared UI components
  src/context/      Authentication state
  src/services/     API and Socket.IO clients
  vite.config.js    Development server and API proxy
docs/               Architecture, API, and payment notes
```

## Prerequisites

- Node.js and npm compatible with the versions required by the installed
  dependencies.
- PostgreSQL.
- Razorpay test credentials to exercise real test-mode checkout (not required
  to run the frontend or backend tests).

## Database setup

Create a PostgreSQL database named `talentbridge` (or use another name through
`DB_NAME`). Set the database connection values in `backend/.env`.

The repository contains incremental migrations under `backend/migrations/`;
it does not contain a complete initial schema/bootstrap script or a migration
runner. Provision the base application schema before applying the incremental
migrations in order. Do not treat the incremental migrations as a fresh
database initializer.

## Local setup

Install dependencies in each application directory:

```sh
cd backend
npm install
cp .env.example .env
```

Set `DB_HOST`, `DB_PORT`, `DB_NAME`, and `DB_USER` in `backend/.env` for your
PostgreSQL instance. Set a private `JWT_SECRET`. Leave Razorpay in test mode
and configure test credentials only when exercising payment checkout.

In another terminal:

```sh
cd frontend
npm install
cp .env.example .env
```

For local development, leave `VITE_API_URL` empty so the Vite `/api` proxy is
used. The example Socket.IO URL points to the local backend.

## Run and verify

Start the backend:

```sh
cd backend
npm run dev
```

Start the frontend in another terminal:

```sh
cd frontend
npm run dev
```

Run the backend test suite:

```sh
cd backend
npm test -- --runInBand
```

Lint and build the frontend:

```sh
cd frontend
npm run lint
npm run build
```

The backend health endpoints are `GET /api/health` and
`GET /api/health/db`.

## API overview

The API is rooted at `/api`. Major route groups cover authentication, jobs,
companies, profiles and skills, projects and proposals, applications,
contracts and payments, conversations, notifications, and reviews. See
[docs/API.md](./docs/API.md) for the route overview.

## Deployment configuration

For a split-origin deployment:

- Set frontend `VITE_API_URL` to the backend API URL including `/api`.
- Set frontend `VITE_SOCKET_URL` to the backend HTTPS/WSS origin.
- Set backend `CORS_ORIGINS` to the exact frontend origin(s).
- Set backend `SOCKET_CORS_ORIGIN` separately for Socket.IO.
- Serve both applications over HTTPS and configure the frontend host to
  rewrite unknown application routes to `index.html` (`BrowserRouter` SPA
  fallback).
- Profile photos are stored on the backend filesystem for local development.
  Production must provide durable, persistent storage shared by all backend
  instances and include uploaded media in backups; ephemeral instance disks
  are not suitable.

See [frontend/README.md](./frontend/README.md) and the env examples for the
configuration names. Do not put backend secrets in frontend environment
variables.

## Security notes

- Keep `.env` files and credentials out of version control.
- Use a strong private `JWT_SECRET`; never expose it to Vite.
- Keep Razorpay key secrets and webhook secrets on the backend. The frontend
  may receive only the public Razorpay key ID needed by Checkout.
- Use exact allowed frontend origins; do not use wildcard CORS origins.
- Development examples use Razorpay test-mode placeholders. Never use live
  credentials to validate a development setup.

## Project status

The repository includes frontend and backend implementations and an automated
backend Jest suite. Production deployment still requires environment-specific
database provisioning, API/Socket.IO origins, HTTPS, and SPA fallback
configuration. No hosted demo or screenshots are currently included.
