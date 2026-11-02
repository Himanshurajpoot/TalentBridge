# Architecture

## Application shape

TalentBridge is split into a Vite/React frontend and an Express/PostgreSQL
backend:

1. `frontend/src/pages` contains route-level screens.
2. `frontend/src/components` contains shared UI such as the application form
   and notification bell.
3. `frontend/src/context/AuthProvider.jsx` owns the authenticated user session.
   The Axios client adds the stored JWT to API requests, and the Socket.IO
   client sends the same token in its handshake.
4. `backend/src/routes` mounts API endpoints and authentication/role
   middleware.
5. `backend/src/controllers` implements request handling and PostgreSQL
   operations through the shared pool in `backend/src/config/db.js`.
6. `backend/src/services` contains shared notification and Razorpay behavior.
7. `backend/server.js` serves the Express application and authenticated
   Socket.IO server from one HTTP server.

## Profile photo storage

Authenticated profile-photo uploads are written to
`backend/uploads/profile-photos` and served as static images from
`/uploads/profile-photos`. The database stores only the generated relative URL
in the existing `profiles.avatar_url` column. Local disk is suitable for
development; production must use durable storage shared across backend
instances (or replace this local storage adapter with an appropriate managed
object store) and include photos in backup and retention policies. Do not rely
on ephemeral deployment filesystems.

## Main domain flows

- Clients create companies, jobs, and projects. Freelancers browse them and
  submit applications or proposals.
- Accepting a proposal creates a contract. Contract participants can submit
  work or approve completion according to role and ownership.
- Notifications are persisted and emitted over Socket.IO. Conversations and
  messages are also handled over authenticated Socket.IO events and the
  conversation HTTP API.
- Contract payment state is stored in PostgreSQL. A verified checkout
  signature remains pending until provider confirmation; funded state is
  recorded only after a valid confirmation. See [PAYMENTS.md](./PAYMENTS.md).

## Database and migrations

Controllers issue parameterized PostgreSQL queries through the shared pool.
`backend/migrations` contains incremental SQL changes, including contract,
payment, review, message-index, and company-index changes. The repository does
not include a complete initial schema/bootstrap script or a migration runner.
Provision the baseline schema separately and apply applicable incremental
migrations in order.

## Configuration boundary

The frontend uses the Vite `/api` proxy in local development. Split-origin
deployments use `VITE_API_URL` for HTTP and `VITE_SOCKET_URL` for Socket.IO.
The backend's HTTP CORS list (`CORS_ORIGINS`) and Socket.IO CORS list
(`SOCKET_CORS_ORIGIN`) are configured independently.
