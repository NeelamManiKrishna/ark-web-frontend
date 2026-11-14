# ARK Web Frontend

React 19 + TypeScript + Vite frontend for **Project ARK (Academic Record Keeper)**, a multi-tenant app for managing school and college academic records. The backend lives in `../ark-backend-services`.

## Setup

```bash
npm install
cp .env.example .env   # then edit
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with HMR. `/api` is proxied to `http://localhost:8080` |
| `npm run build` | Type-check (`tsc -b`) and production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (single run). `npm run test:watch` for watch mode |
| `npm run preview` | Preview the production build |

## Environment

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Backend base URL, no trailing slash. Leave empty to use the dev proxy / same origin |
| `VITE_USE_MOCK_AUTH` | `true` mocks `/auth/me`, `/logout`, `/logout-all`, `/change-password` until the backend has them (login and refresh stay real) |

`VITE_*` values are bundled into the browser build. Never put secrets in them.

## Deployment note

Serve the built app with a Content-Security-Policy header (for example `default-src 'self'; connect-src 'self' <api-origin>; style-src 'self' 'unsafe-inline'`). Auth tokens are kept in browser storage, so avoid `dangerouslySetInnerHTML` and third-party scripts.

See `CLAUDE.md` for architecture and conventions, and `docs/` for the plan and API guides.
