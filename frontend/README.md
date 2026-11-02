# TalentBridge frontend

The frontend is the React single-page application for TalentBridge clients and
freelancers. It includes project/job discovery and management, profile tools,
contracts, messaging, notifications, and payment checkout.

## Setup and development

```sh
npm install
cp .env.example .env
npm run dev
```

By default, Vite serves the frontend on port `5173` and proxies `/api` to
`http://127.0.0.1:5001`. Keep `VITE_API_URL` empty for this local setup.
The local Socket.IO fallback points to the same backend.

## Environment variables

- `VITE_API_URL` (optional): API base URL, including `/api`. Set this when
  frontend and backend are on separate origins; otherwise the app uses `/api`.
- `VITE_SOCKET_URL`: Socket.IO backend URL. Production builds require an
  explicit URL and reject loopback hosts. Local development may use the
  existing localhost fallback.

Vite variables are included in browser assets. Never put passwords, JWT
secrets, database credentials, or Razorpay secret keys in frontend variables.

## Quality checks and production build

```sh
npm run lint
npm run build
```

For split-origin production, configure `VITE_API_URL` to the backend API URL
including `/api`, and `VITE_SOCKET_URL` to the backend HTTPS/WSS origin. The
backend must separately allow the deployed frontend origin in both
`CORS_ORIGINS` and `SOCKET_CORS_ORIGIN`.

The application uses `BrowserRouter`; production hosting must rewrite unknown
frontend routes to `index.html`.
