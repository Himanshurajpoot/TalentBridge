# API overview

The Express API is mounted below `/api`. JSON routes use the bearer token
stored by the frontend auth provider. Role and object-ownership rules are
enforced by backend middleware/controllers; frontend visibility is not an
authorization boundary.

## Route groups

| Prefix | Purpose |
|---|---|
| `/api/auth` | Registration, login, current user, client/freelancer-only examples |
| `/api/companies` | List and create companies owned by the authenticated user |
| `/api/jobs` | Browse, view, create, and list the authenticated client's jobs |
| `/api/jobs/:jobId/applications` | Submit and manage applications |
| `/api/projects` | Browse, create, view, and complete projects; manage project skills |
| `/api/projects/:projectId/proposals` | Submit and manage project proposals |
| `/api/profile` | Current profile and profile skills |
| `/api/skills` | List available skills and admin skill management |
| `/api/contracts` | List/view participant contracts, submit work, approve work, payment flows |
| `/api/conversations` | Create/list conversations and access messages |
| `/api/notifications` | List current user's notifications and mark read |
| `/api/projects/:projectId/reviews` | Create/list project reviews |
| `/api/users/:userId/reviews` | List user reviews and rating |

Additional proposal, application, and review routes are mounted at `/api`.
The code in `backend/src/routes` is authoritative for exact methods,
middleware, and parameters.

## Profile photos

- `POST /api/profile/me/photo` accepts one multipart field named `photo`.
  The caller must be authenticated. JPEG, PNG, and WebP content up to 5 MB is
  accepted and saved to the caller's own profile.
- `DELETE /api/profile/me/photo` removes the caller's current photo.
- Uploaded files are served from `/uploads/profile-photos/<generated-name>`.
  The client cannot choose a storage path or another user's profile.

## Health checks

- `GET /api/health` reports API process availability.
- `GET /api/health/db` checks PostgreSQL connectivity.

## Realtime events

Socket.IO runs on the backend HTTP server and requires a valid JWT in the
connection handshake. Conversation events include `getMyConversations`,
`joinConversation`, `getConversationMessages`, `sendMessage`,
`conversationOpened`, `conversationClosed`, and `markAsRead`. Notifications
are emitted as `newNotification`. See `backend/server.js` for event payloads
and authorization checks.

## Payment endpoints

- `POST /api/contracts/:contractId/payment-orders` creates or recovers an
  idempotent Razorpay order for an eligible contract.
- `POST /api/contracts/payment-verifications/razorpay` verifies checkout
  details.
- `POST /api/contracts/payment-webhooks/razorpay` processes signed provider
  webhooks.

Payment-specific behavior is documented in [PAYMENTS.md](./PAYMENTS.md).
