# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Project ARK (Academic Record Keeper)** is a multi-tenant web app for managing academic records for schools and colleges. This repo is the React frontend; the Spring Boot backend lives in the sibling directory `../ark-backend-services`. The full BRD is `ark_brd_doc.txt` (repo root) and the user manual is `ARK_User_Manual.docx`.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server. Proxies `/api` to `http://localhost:8080` (the backend) |
| `npm run build` | `tsc -b` type-check, then Vite build |
| `npm run lint` | ESLint across the project |
| `npm run preview` | Preview the production build |

`npm run test` runs Vitest (jsdom + Testing Library, tests sit next to the code as `*.test.ts(x)`). Run one file with `npx vitest run src/auth/tokenStore.test.ts`. Verify changes with lint, build and test.

Set `VITE_API_BASE_URL` to point at a non-proxied backend. It defaults to `''`, so same-origin or the dev proxy.

## Tech Stack

React 19, TypeScript (strict), Vite 7 + SWC, Bootstrap 5 (CSS only, no component library), `react-router-dom` v7. There is no state library, data-fetching library or form library. Hooks, `useState` and the Auth context cover state.

## TypeScript Rules

- `verbatimModuleSyntax`: use `import type` for type-only imports.
- `erasableSyntaxOnly`: no enums or parameter properties.
- `noUnusedLocals` and `noUnusedParameters` are enforced.
- `allowImportingTsExtensions` is on, and the codebase **always imports with the explicit extension** (`'../api/client.ts'`, `'./App.tsx'`). Follow this.

## Architecture

**Layering** (each domain, such as students or examinations, spans these in parallel):
`src/types/<domain>.ts` (request and response interfaces) → `src/api/<domain>Api.ts` (thin functions) → `src/pages/<Page>.tsx` (stateful screens with inline modals).

- **`src/api/client.ts`** is the single HTTP layer (`get/post/put/del/postMultipart/downloadFile`). It handles Bearer auth from localStorage, a 30s timeout, retries on network errors and 408/429/502/503/504, and errors as `ApiError` (see Auth). On a 401 it makes one deduplicated refresh attempt, then ends the session via an event (no page reload). `downloadFile` is async, rejects on failure and does not retry a 401. Never call `fetch` directly from pages. Add an API function instead.
- **API function conventions**: paths are `/api/v1/organizations/${organizationId}/<resource>`. List endpoints are paginated and return `PagedResponse<T>` (`{content, page}`), build query strings with `URLSearchParams`, and take `page` (0-based), `size` and `sort` (`field,asc|desc`).
- **Auth** (`src/auth/`, `src/context/AuthContext.tsx`, `useAuth`): `tokenStore.ts` is the only code that touches storage keys. `refreshSession.ts` is the one deduplicated refresh used by both `client.ts` and the context timer, and it stores the rotated refresh token each time. `client.ts` ends a dead session by emitting an event (`authEvents.ts`); the context clears state and `ProtectedRoute` redirects to `/login` (keeping the deep link as `from`, showing `sessionNotice`), with no page reload. A `storage` listener syncs login/logout across tabs. After login the context loads the access `scope` from `GET /auth/me` (falls back to the login user if unavailable). Errors are `ApiError` (`auth/apiError.ts`: `code`, `status`, `fieldErrors`). `UserRole` is an open union, so never assume exactly four roles. `VITE_USE_MOCK_AUTH=true` mocks the not-yet-built account endpoints (`api/mock/mockAccount.ts`).
- **Routing** (`src/App.tsx`): pages are lazy-loaded. Every route is wrapped in the local `<Page roles={...}>` helper, which adds `ErrorBoundary`, `Suspense` and an optional `RoleGuard`. Routes sit under `ProtectedRoute` and `Layout`. URLs are nested by tenant, for example `organizations/:organizationId/branches/:branchId/classes/:classId/...`, and pages read these ids from `useParams`.
- **RBAC** (`src/config/permissions.ts`): the one table of feature → `view` roles and `write` roles, mirroring the backend `@PreAuthorize` rules. `roles.ts` derives `ROLE_PERMISSIONS` (view) and `WRITE_ROLES` (write) from it for existing call sites (`useCanWrite(WRITE_ROLES.x)`, `<Page roles={ROLE_PERMISSIONS.x}>`); the sidebar reads `viewRoles()`. Add a feature in `permissions.ts` only. Frontend checks are UX only, because the backend enforces access.
- **Branch scoping**: a user whose scope is not `allBranches` and has exactly one branch (ADMIN, USER) is locked to it. `useAdminBranchScope` derives this from the scope and Faculty presets and disables its branch filter with it.
- **New in Phase 4:** `api/catalogApi.ts` (academic years, subjects), `api/reportApi.ts` (JSON + CSV), `getOrganizationAuditLogs`, `q` search param on student/faculty/user/class/branch lists (`SearchBox` + `useDebounce`), pages `Reports`, `Settings` (org details, academic years, subjects) and `AuditLogs` (org mode when the URL has `:organizationId`). `Modal` ignores backdrop clicks unless `closeOnBackdrop`.
- **Paging helpers:** the backend caps `size` at 100 (a request for 200 or 1000 silently returns 100). To load a whole list (dropdowns, a class roster) use `fetchAll((p, s) => getX(..., p, s))` from `api/paging.ts`; never pass a bigger `size`.
- **Page headers:** `useTenantNames(organizationId, branchId?, classId?)` returns cached `orgName`, `branchName`, `className`; do not fetch names in pages.
- **Detail tabs:** `components/PageTabs.tsx` (`ClassTabs`, `StudentTabs`, `FacultyTabs`) render a tab bar over the existing detail routes; each tab is its own route and page. Add `<XTabs />` at the top of a new detail page.
- **Shared UI** in `src/components/` (`Modal`, `ConfirmModal`, `Pagination`, `SortableHeader`, `StatusBadge`, `Toast`, `BulkImportModal` and others). Reuse these rather than adding new ad-hoc markup. Shared styles are `src/styles/{modal,table,page}.css`, imported globally in `main.tsx`.
- **List page pattern** (Students, Faculty, Branches, and so on): `page`, `size` and `sort` state, a `useCallback` fetch with all three in its deps, `useEffect(() => setPage(0), [sort])`, `SortableHeader` for sortable columns, and `Pagination`.

## Docs

- `CHANGELOG.md` is a per-session log of changes, newest first. Check it for the history and rationale of a feature, and add an entry for significant work.
- `docs/enrollment-assignment-api.md` is the integration guide for enrollments, faculty assignments, performance, class progression and promotions. It was verified against the backend's Swagger (`http://localhost:8080/v3/api-docs`).
