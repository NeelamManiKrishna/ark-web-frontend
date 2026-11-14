# ARK Frontend Plan

Standalone execution plan for one Claude Code session. Open the session in `D:\ARK\Development\ark-web-frontend` and give it this file. Work phase by phase, tick the boxes, and stop for review after each phase.

**Why:** the review in `D:\ARK\Development\docs\ARK_Review_and_Plan.md` found security holes, data bugs, duplicated screens and schema weaknesses. Parents will later see student metrics in a mobile app, so sign-in follows the shared contract in Part A, which the backend session uses too. Do not change Part A on one side only.

Assumptions: a future `PARENT` role stored as a normal `User` linked to students; the 4 current roles stay; mobile uses the same `/api/v1` REST API.

---

## PART A: Shared contract (goes into BOTH files)

### A1. Auth rules (web and future mobile use the same ones)
- **Bearer tokens in the JSON body**, not cookies, so the web app and a mobile app work the same way. Web XSS risk is reduced with a CSP header and no `dangerouslySetInnerHTML`.
- `POST /api/v1/auth/login` body `{email, password, deviceId?, deviceName?}` returns `{accessToken, refreshToken, expiresIn, user:{id,name,email,role,organizationId,branchId}}`.
- `POST /auth/refresh` body `{refreshToken}` returns a new pair. **Refresh tokens rotate**: each is single-use. Reusing an old one revokes that whole device session.
- `POST /auth/logout` `{refreshToken}` returns 204 (revokes that device). `POST /auth/logout-all` revokes every device.
- `GET /auth/me` returns the user plus their **scope** (`{role, organizationId, branchIds[], studentIds[]}`). The frontend and mobile app use it as the single source of "who am I and what can I see".
- `POST /auth/change-password` `{currentPassword,newPassword}`; success revokes all other sessions.
- `POST /auth/register` is **removed**. Accounts are created only by admins (`POST /organizations/{o}/users`).
- Access token: short and configurable (default 30 min). Refresh token: configurable (default 7 days web, 30 days when `deviceId` is sent).
- JWT claims: `sub` (userId), `role`, `org`, `branch`, `ver` (user token version, bumps on password change/disable), `typ`.
- Roles are an **extensible set**: `SUPER_ADMIN, ORG_ADMIN, ADMIN, USER` today; `PARENT` later. No code may assume exactly four.
- Access decisions always use one object, **AccessScope** (`role, orgId, branchIds, studentIds`). Parents later get `studentIds` from a parent-student link, with no change to the rule engine.

### A2. Error body (stable, so web and mobile can branch on `error`)
`{error:"CODE", message:"human text", timestamp, path, fieldErrors?:[{field,message}]}`
Codes: `INVALID_CREDENTIALS`(401), `TOKEN_EXPIRED`(401), `TOKEN_REVOKED`(401), `ACCOUNT_LOCKED`(403), `ORG_SUSPENDED`(403), `FORBIDDEN`(403), `NOT_FOUND`(404), `DUPLICATE`(409), `CONFLICT`(409), `VALIDATION_FAILED`(422), `BAD_REQUEST`(400).

### A3. API conventions
- Lists: `GET ...?page=0&size=20&sort=field,asc&q=text`, response `{content, page:{size,number,totalElements,totalPages}}`. `size` max 100. The new `q` param searches by name/email/id fields for that resource.
- Everything stays under `/api/v1`. OpenAPI (`/v3/api-docs`) is the source of truth and is what mobile clients will be generated from.
- Reports return JSON; CSV export via `?format=csv` on the same endpoint.
- New endpoints needed by the frontend: `/auth/me`, `/auth/logout`, `/auth/logout-all`, `/auth/change-password`, `q` on list endpoints, academic-years and subjects lists, `PUT /organizations/{o}` for ORG_ADMIN (own org), `GET /organizations/{o}/audit-logs` for ORG_ADMIN, report endpoints.

### A4. Role rules (what the UI must mirror, backend enforces)
| Role | Scope | Read | Write |
|---|---|---|---|
| SUPER_ADMIN | all orgs | everything | orgs, all |
| ORG_ADMIN | own org, all branches | everything in org | everything in org except creating/deleting the org |
| ADMIN | own org, **own branch only** | own branch | academic records in own branch; creates USER accounts in own branch only |
| USER | own org, **own branch only** | own branch (govt ID masked) | nothing |
| PARENT (later) | linked students only | their children's metrics | nothing |

### A5. Order of work and sync points
1. Backend Phase 0 and frontend Phase 0 can start together (no dependency).
2. **Sync point 1:** backend Phase 1 publishes the A1/A2 endpoints. Frontend Phase 1 can build against the contract with a mock until then.
3. **Sync point 2:** backend Phase 3 adds `q`, academic-years, subjects. Frontend Phase 4 uses them.
4. Backend finishes Phase 2 and 3 while frontend does Phase 4. Docs (Phase 5) last.

---

## PART C: FRONTEND PLAN  (repo: `D:\ARK\Development\ark-web-frontend`)

**Read first:** this repo's `CLAUDE.md`, `CHANGELOG.md` (top), `docs/enrollment-assignment-api.md`; the review at `../docs/ARK_Review_and_Plan.md`. Keep the TS rules (`import type`, explicit `.ts/.tsx` extensions, no enums, no unused locals). Add a `CHANGELOG.md` entry per phase. Do not commit unless asked.

### Phase 0: Tooling and hygiene
- [ ] Add `tsconfig.node.json` (for `vite.config.ts`), `eslint.config.js` (flat config: typescript-eslint, react-hooks, react-refresh), and `.gitignore` (`node_modules`, `dist`, `.env*`, `.DS_Store`). Check that `npm run lint` and `npm run build` pass; fix what they report.
- [ ] Replace the Vite template `README.md` with run/build/env instructions (`VITE_API_BASE_URL`).
- [ ] Remove leftovers (`src/assets/react.svg`, `public/vite.svg`) if unused. Add Vitest + Testing Library (`npm run test`).
- [ ] Add CI workflow: lint, build, test.

### Phase 1: Auth and role handling (needs Part A; mock until backend Phase 1)
Files: `src/api/client.ts`, `src/api/authApi.ts`, `src/context/AuthContext.tsx`, `src/components/ProtectedRoute.tsx`, `RoleGuard.tsx`, `src/config/roles.ts`, `src/hooks/useAdminBranchScope.ts`, `src/types/auth.ts`.
- [ ] One token module (`src/auth/tokenStore.ts`): the only reader/writer of storage keys; `client.ts` and `AuthContext` both use it. One shared, deduplicated refresh; handle rotation (store the new refresh token every time).
- [ ] Remove `window.location.href` hard redirects; use an event the context listens to so the router navigates and shows "Session expired".
- [ ] `storage` event listener for cross-tab logout/login.
- [ ] Logout calls `POST /auth/logout`. Add `/me` page: profile (`GET /auth/me`) and change password.
- [ ] After login, call `/auth/me` and store `scope`; derive branch lock from it (delete the extra `getUserById` in `useAdminBranchScope`, use the scope for every page, not only Faculty).
- [ ] Keep the post-login deep link (`from` location). Add a "Not allowed" page for `RoleGuard` instead of silent redirect.
- [ ] Make `Role` an open union type with a helper `hasRole`; no exhaustive-four assumptions (for future `PARENT`).
- [ ] Surface server messages for 403 and 409 (use the Part A2 `error` code to pick friendly text); show `fieldErrors` on forms.
- [ ] Add a Content-Security-Policy meta/headers note in `index.html`/deploy docs.
**Acceptance:** tests for tokenStore, refresh dedupe and rotation, role guard; manual check as all four seeded roles; expired token redirects with a message and keeps the deep link; logout in one tab logs out the other.

### Phase 4: Structure, routing and shared components (needs backend `q`, academic-years, subjects)
- [ ] **Permission table:** one file (`src/config/permissions.ts`) defining feature → view roles, write roles, and `branchLocked`. Sidebar, routes and `useCanWrite` all read it. Remove `ROLE_PERMISSIONS`/`WRITE_ROLES` duplication. Fix inconsistencies: Promotions use `useCanWrite`; ClassProgression write rule matches the backend.
- [ ] **Shared kit:** `usePagedList` (page/size/sort/q/debounce/cancel), `DataTable` (sortable header with `aria-sort`, caption, empty/loading states), `useTenantNames` (org and branch names, cached), `PermissionGate`, `FormModal`. Convert the big list pages (Students, Faculty, Classes, Users, Branches, Examinations) to them; target under ~300 lines each.
- [ ] **Search:** add a search box (`q`) on students, faculty, users, classes, branches. Replace every hard-coded `0,100`/`0,1000` fetch with paged or searchable selectors (async select component for big lists).
- [ ] **New route tree** (see Section C1 below) with redirects from every old URL so bookmarks keep working. Org and branch come from `scope` for non-super-admins and are not editable.
- [ ] **Merge overlapping pages into tabs:** Students (Profile | Enrollments | Report cards), Faculty (Profile | Assignments | Performance), Class (Roster | Teachers | Results | Promotion), Exam (Subjects | Enter marks | Results). Delete `OrgStudents` (branch filter replaces it), `ClassExams`, `StudentExams`, and the orphan `FacultyAssignments` after moving its bulk-assign modal into the class Teachers tab (one implementation).
- [ ] **Sidebar:** grouped (People, Academics, Reports, Admin), unique icons, active state with `aria-current`, closes on route change on mobile. ORG_ADMIN gets Classes and Exams links; USER gets read links only.
- [ ] **Reports page** replaces both stubs: enrollment summary and exam performance from the backend report endpoints, with a CSV download that handles errors (fix `downloadFile`: check `res.ok`, attach and remove the link, catch). Add an org **Settings** tab (ORG_ADMIN) and an org **Audit** tab (ORG_ADMIN: own org; SUPER_ADMIN: all) with date filter.
- [ ] **Accessibility:** toast `role="status"`/`aria-live`, close button label, table `caption`/`scope`, keyboard-operable quick actions, skip link, form errors via `aria-describedby`, `ConfirmModal` loading label from props, modal backdrop click does not discard unsaved forms.
- [ ] Responsive check at phone width for the new layout.
**Acceptance:** `npm run lint && npm run build && npm run test` pass; click through all four roles: sidebar equals allowed routes, old URLs redirect, ADMIN/USER cannot change branch, no page file over ~400 lines, no duplicate page for the same data.

### C1. Target route tree
```
/login   /me   /   (dashboard)   /organizations  (SA)
/o/:orgId/settings              (OA)
/o/:orgId/branches              (SA, OA)
/o/:orgId/people/students       (?branch=)  -> /students/:id  [Profile | Enrollments | Report cards]
/o/:orgId/people/faculty        (?branch=)  -> /faculty/:id   [Profile | Assignments | Performance]
/o/:orgId/people/users          (SA, OA; ADMIN creates USER only in own branch)
/o/:orgId/academics/classes     -> /classes/:id [Roster | Teachers | Results | Promotion]
/o/:orgId/academics/progression
/o/:orgId/academics/exams       -> /exams/:id [Subjects | Enter marks | Results]
/o/:orgId/reports
/o/:orgId/audit                 (SA, OA)
```

### Phase 5 (frontend part)
- [ ] Update `CLAUDE.md` (permission table, token module, shared kit, route tree) and `docs/` API doc; add tests for the permission table and `usePagedList`; update `ARK_User_Manual.docx` text for new navigation (manual edits only after you confirm).

### Mobile-readiness checklist (web side)
- [ ] No web-only assumptions in API modules (they only call the contract in Part A). [ ] Types in `src/types` match OpenAPI; consider generating them from `/v3/api-docs` later. [ ] `Role` type is open. [ ] Nothing depends on cookies.

### Frontend verification
`npm run lint`, `npm run build`, `npm run test`; run backend with seed (password `Password@123`) and walk through every role; confirm token refresh/rotation, cross-tab logout, redirects from old URLs, and mobile-width layout.
