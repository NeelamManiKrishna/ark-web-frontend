# ARK Web Frontend - Change Log

## 2026-03-21

### Session 79: Pagination, Sorting & Ordering (Backend Section 39)

**New component:** `src/components/SortableHeader.tsx` — Clickable column header with sort direction indicator (▲/▼). Active column shown in blue, inactive in muted. Toggles between asc/desc on click.

**API updates (Session 78):** Added `sort?: string` parameter to all 17 paginated API functions across 10 files. Passes `?sort=field,asc|desc` to backend. Refactored 4 API files from template literals to `URLSearchParams` for consistency.

**Page integrations (Session 79):**
2. Added `import SortableHeader from '../components/SortableHeader.tsx'` to all 7 files.
3. Added `const [sort, setSort] = useState(...)` to each file with page-appropriate defaults: `firstName,asc` (Students, Faculty), `name,asc` (Organizations, Branches, Classes), `fullName,asc` (Users), `timestamp,desc` (AuditLogs).
4. Updated each fetch function to pass `sort` as the last argument to the API call.
5. Added `sort` to each `useCallback` dependency array.
6. Added `useEffect(() => { setPage(0) }, [sort])` after the fetch effect in all 7 files.
7. Replaced relevant `<th>` elements with `<SortableHeader>` components — 3 columns in Students (firstName, email, status), 4 in Faculty (firstName, department, designation, status), 3 in Organizations (name, contactEmail, status), 4 in Branches (name, city, state, status), 4 in Classes (name, section, academicYear, status), 4 in Users (fullName, email, role, status), 3 in AuditLogs (timestamp, action, entityType). Non-sortable columns (ARK ID, Phone, Capacity, Branch, Department, Actions, Entity Name, Performed By, Role, Details) kept as plain `<th>`.

**Verification:** `npm run lint` — 0 errors; `npm run build` — clean.

---

### Session 78: Add `sort` Parameter to All Paginated API Functions

1. Read all 10 target API files to understand existing signatures and URL-building patterns.
2. Updated `src/api/studentApi.ts` — added `sort?: string` to `getStudents()` and appended `if (sort) params.set('sort', sort)` before the return.
3. Updated `src/api/facultyApi.ts` — same pattern applied to `getFaculty()`.
4. Updated `src/api/organizationApi.ts` — `getOrganizations()` was using an inline template string; refactored to use `URLSearchParams` and added `sort` parameter.
5. Updated `src/api/branchApi.ts` — `getBranches()` was using an inline template string; refactored to use `URLSearchParams` and added `sort` parameter.
6. Updated `src/api/academicClassApi.ts` — `getAcademicClasses()` was using an inline template string; refactored to use `URLSearchParams` and added `sort` parameter.
7. Updated `src/api/userApi.ts` — `getUsers()` was using string concatenation; refactored to use `URLSearchParams` and added `sort` parameter.
8. Updated `src/api/auditLogApi.ts` — added `sort?: string` to `getAuditLogs()` and appended `if (sort) params.set('sort', sort)`.
9. Updated `src/api/examinationApi.ts` — added `sort?: string` and the conditional `params.set` call to all four paginated functions: `getExaminations()`, `getExamSubjects()`, `getExamResults()`, `getClassExamResults()`.
10. Updated `src/api/enrollmentApi.ts` — added `sort` to `getEnrollmentsByBranch()` and `getEnrollmentsByClass()`.
11. Updated `src/api/facultyAssignmentApi.ts` — added `sort` to `getAssignmentsByBranch()`, `getAssignmentsByClass()`, and `getAssignmentsByFaculty()`.

## 2026-03-18

### Session 77: Exam Subjects — Batch Creation & Grouped Display

`src/pages/ExamSubjects.tsx` — Complete redesign:

**Batch creation (replaces one-at-a-time modal):**
- Enter subject details once (name, code, max marks, pass marks, exam date)
- Select multiple classes via checkbox list with "Select All / Deselect All"
- "Already exists" badge shown next to classes that already have the subject
- Skips duplicates automatically with count feedback ("3 created, 1 skipped")
- Button renamed from "+ New Exam Subject" to "+ Add Subject to Classes"

**Grouped display (replaces flat list):**
- Subjects grouped by class with class name as section header + count badge
- Each class group has its own compact table
- Class filter dropdown to focus on a specific class

**Edit modal simplified:**
- Shows class name as read-only context
- Subject details editable + status dropdown

**Before:** 50 modal submissions for 10 classes × 5 subjects
**After:** 5 submissions (one per subject, selecting all 10 classes each time)

**Verification:** `npm run lint` — 0 errors; `npm run build` — clean.

---

### Session 76: Fix Enter Marks — Stale Marks When Switching Subjects

1. `src/pages/EnterMarks.tsx` — Fixed two issues causing marks from a previously selected subject to show when switching to a different subject:
   - **Immediate clear on subject change:** Added `setEntries([])` at the start of `loadMarks()` before the async fetch begins, so stale entries from the previous subject are not displayed during loading.
   - **Safety filter on results:** Added `examSubjectId` check when building the result map — only includes results matching the selected subject ID, guarding against any backend response that might include cross-subject results.

**Verification:** `npm run lint` — 0 errors; `npm run build` — clean.

---

### Session 75: Enter Marks — Class-Centric Spreadsheet-Style Marks Entry

**New page:** `src/pages/EnterMarks.tsx`
- Route: `/organizations/{orgId}/branches/{branchId}/classes/{classId}/enter-marks`
- Accessed from Classes page via new "Enter Marks" button per class row
- **Flow:** Pick Exam → Pick Subject (filtered to this class) → Inline editable table with all students
- **Table columns:** #, Student Name, Marks (input), Remarks (input), Grade (read-only from backend), Status (read-only)
- **Features:**
  - Pre-loads existing marks if already entered (edit mode)
  - Dirty tracking — changed rows highlighted in yellow
  - "Save All (N)" button shows count of unsaved changes
  - Bulk save — creates new results or updates existing ones in parallel
  - After save, reloads marks to show backend-calculated grades and pass/fail status
  - Inline validation: marks cannot exceed max marks or be negative
  - Max/Pass marks info bar shown when subject is selected
  - Summary footer: total students, marks entered count, unsaved changes count
  - Read-only mode for User role (no input fields)

**Route & navigation:**
- `src/App.tsx` — Added lazy import for `EnterMarks` and route under examinations permissions
- `src/pages/Classes.tsx` — Added "Enter Marks" button per class row (before existing "Results" button)

**Architecture improvement:** Reduces mark entry from 5-click-deep modal-per-student flow to 2-click spreadsheet: Classes → Enter Marks → select exam+subject → enter all marks inline.

**Verification:** `npm run lint` — 0 errors; `npm run build` — clean.

---

### Session 74: Fix Student Dropdown Scoping (Class-Level Filtering)

1. **`src/pages/ExamResults.tsx`** — Student dropdown in "New Result" modal now filters by `subject.classId` instead of showing all branch students. Restructured effects: exam fetch sets `examBranchId`, subject fetch runs separately, student fetch waits for both exam branchId and subject classId before calling `getStudents(orgId, 0, 1000, examBranchId, subject.classId)`.

2. **`src/pages/ClassEnrollments.tsx`** — Student name map fetch now passes `classId` as 5th parameter to `getStudents()`. Previously fetched all branch students for name lookup; now scoped to the class.

**No new backend APIs needed** — `getStudents()` already supported both `branchId` and `classId` filters.

**Verification:** `npm run lint` — 0 errors; `npm run build` — clean.

---

### Session 73: CSV Bulk Import Feature (Backend Section 37)

**New files:**
1. `src/types/bulkImport.ts` — Types: `BulkImportResponse` (entityType, totalRows, successCount, failureCount, errors) and `RowError` (row, message).
2. `src/api/bulkImportApi.ts` — API functions: `importStudents`, `importFaculty`, `importAcademicClasses`, `importBranches` (all multipart POST), `downloadSampleCsv` (GET download).
3. `src/components/BulkImportModal.tsx` — Reusable modal with file picker, "Download Sample CSV" link, upload with progress state, result summary (total/success/fail cards), scrollable error table (row + message).
4. `src/api/client.ts` — Added `postMultipart()` helper (FormData upload, omits Content-Type for browser boundary) and `downloadFile()` helper (authenticated blob download).

**Page integrations (all with "Import CSV" button gated by `canWrite`):**
5. `src/pages/Branches.tsx` — entityType `branches`, onComplete refreshes branch list.
6. `src/pages/Classes.tsx` — entityType `academic-classes`, onComplete refreshes class list.
7. `src/pages/Students.tsx` — entityType `students`, onComplete refreshes student list.
8. `src/pages/Faculty.tsx` — entityType `faculty`, onComplete refreshes faculty list.

**UX flow:** Click "Import CSV" → modal with file picker + sample download → Upload → result summary with success/fail counts → scrollable error table for failed rows → "Done" closes and refreshes list.

**Verification:** `npm run lint` — 0 errors; `npm run build` — clean.

---

## 2026-03-16

### Session 72: Fix Students Class Column (Enrollment as Source of Truth)

1. `src/pages/Students.tsx` — Fixed the Class column showing blank for students created after backend Section 34 (Student.classId dual-write removed).
   - After fetching students, batch-fetches active enrollments in parallel for all students on the page via `getActiveEnrollment`
   - Builds `enrollmentClassMap` (studentId → classId) from active enrollments
   - Class column now resolves: enrollment classId → fallback student.classId → "—"
   - Shows "—" for students with no active enrollment (graduated, transferred, etc.)

**Verification:** `npm run lint` — 0 errors; `npm run build` — clean.

---

### Session 71: Faculty Button on Branches Page

1. `src/pages/Branches.tsx` — Added "Faculty" action button per branch row. Navigates to `/organizations/{orgId}/faculty?branchId={branchId}`, pre-filtering the Faculty page to that branch.
2. `src/pages/Faculty.tsx` — Reads `branchId` from URL query param (`useSearchParams`) and initializes the branch filter dropdown with it. Allows direct navigation from Branches page with branch pre-selected.

**Verification:** `npm run lint` — 0 errors; `npm run build` — clean.

---

### Session 70: Remove Assignments Button from Faculty Page

1. `src/pages/Faculty.tsx` — Removed the "Assignments" action button from the faculty table rows. Faculty assignments are now managed exclusively from the Classes page via "Assign Faculty". The per-faculty FacultyAssignments page and route still exist (accessible via direct URL) for viewing/editing/deleting individual assignments.

**Verification:** `npm run lint` — 0 errors; `npm run build` — clean.

---

### Session 69: Assign Faculty from Branch-Level Classes Page

1. `src/pages/Classes.tsx` — Added "Assign Faculty" button in the header (next to Progression and + New Class).
   - Opens a modal with the full assignment workflow at branch level:
     - **Faculty dropdown** — lists all faculty in the branch (name + department)
     - **Assignment Type** and **Subject** (side-by-side, subject conditional on type)
     - **Class checklist** — grouped by academic year with select-all per year, indeterminate state
     - **Bulk creation** — creates assignments for all selected classes in parallel with success/fail count
   - Fetches faculty and all branch classes on modal open
   - No need to navigate to Faculty > individual faculty > Assignments anymore

**Verification:** `npm run lint` — 0 errors; `npm run build` — clean.

---

### Session 68: Faculty Assignments — Multi-Select Bulk Assign UI

1. `src/pages/FacultyAssignments.tsx` — Completely redesigned the "New Assignment" modal into a bulk assign workflow:
   - **Multi-select checklist** replaces single class dropdown — classes grouped by academic year with "select all" per year group
   - **Indeterminate checkbox** on year headers when partially selected
   - **"Already assigned" badge** shown next to classes that already have an active assignment
   - **Bulk creation** — creates assignments for all selected classes in parallel with success/fail count feedback
   - **Simplified flow**: Pick type → Enter subject (if needed) → Check classes → Assign
   - Scrollable class list (max 300px) for branches with many classes
   - Button shows selection count: "Assign (3)"
   - Button renamed from "+ New Assignment" to "+ Assign Classes"
   - Academic year field completely removed (derived from each class automatically)

**Verification:** `npm run lint` — 0 errors; `npm run build` — clean.

---

### Session 67: Align with Backend Session 5 (Sections 34-35)

1. **Audit Logs — `LOGIN_FAILED` action added**
   - `src/types/auditLog.ts` — Added `'LOGIN_FAILED'` to `AuditAction` union type.
   - `src/pages/AuditLogs.tsx` — Added `LOGIN_FAILED` to the `ACTIONS` filter array and `ACTION_CLASSES` badge map (red `bg-danger`).

2. **Student `classId` removed from update flow**
   - `src/types/student.ts` — Removed `classId` from `UpdateStudentRequest` (backend ignores it; enrollment is source of truth).
   - `src/pages/Students.tsx` — Stripped `classId` from the update payload destructure alongside `academicYear`.

3. **No changes needed for:** `@Transactional` cascade deletes, active enrollment guard on class delete, enrollment history org-scoping, optimistic locking 409 (backend message is already user-friendly), N+1 fix, max page size cap, JWT externalization, org listing restriction, password hash exclusion, CORS whitelist.

**Verification:** `npm run lint` — 0 errors; `npm run build` — clean.

---

### Session 66: Class Progression — Dropdown-Based Class Selection

1. `src/pages/ClassProgression.tsx` — Redesigned class progression to use a dropdown populated from existing classes in the branch instead of free-text input.
   - Fetches classes via `getAcademicClasses` and deduplicates names (same class name across sections/years appears once)
   - Classes already in the sequence are excluded from the dropdown
   - Class names in the sequence table are now read-only text (no inline editing)
   - Reorder (↑↓), Terminal checkbox, and Remove actions remain unchanged
   - "Save Changes" button only appears when changes are pending (dirty state)
   - Visual progression path preview preserved

**Verification:** `npm run lint` — 0 errors; `npm run build` — clean.

---

### Session 65: Align with Backend Section 32 — Government ID for Students & Faculty

**New fields:** `govtIdType` (enum) and `govtIdNumber` (string) — **mandatory on create**, optional on update.

**GovtIdType options:** Aadhaar, PAN, Passport, Driving License, Voter ID, Other

**Types updated:**
1. `src/types/student.ts` — Added `GovtIdType` type alias. Added `govtIdType` and `govtIdNumber` (required) to `CreateStudentRequest`. Added optional `govtIdType?`/`govtIdNumber?` to `StudentResponse` and `UpdateStudentRequest`.
2. `src/types/faculty.ts` — Added `FacultyGovtIdType` type alias. Added `govtIdType` and `govtIdNumber` (required) to `CreateFacultyRequest`. Added optional to `FacultyResponse`, `UpdateFacultyRequest`, `FacultyFormData`.

**Constants:**
3. `src/constants/statuses.ts` — Added `GOVT_ID_TYPE_OPTIONS` array.

**Form updates:**
4. `src/pages/Students.tsx` — Added Govt ID Type dropdown (required) and Govt ID Number text input (required, max 50 chars). New Row 5 between gender/enrollment and guardian rows. Red `*` indicators and validation error feedback on both fields.
5. `src/pages/Faculty.tsx` — Same Govt ID row (new Row 5 before Department). Required validators, red `*` labels, error feedback. Create payload sends values directly; update payload sends `undefined` for empty strings.
6. `src/pages/Students.tsx` — Split `studentSchema` into `baseStudentSchema` (create, govtId required) and `editStudentSchema` (update, govtId optional, academicYear skipped). Dynamically selects schema based on `editingStudent` state.
7. `src/pages/Faculty.tsx` — Split `facultySchema` into `baseFacultySchema` (create, govtId required) and `editFacultySchema` (update, govtId optional). Dynamically selects schema based on `editingFaculty` state.

**Verification:** `npm run lint` — 0 errors; `npm run build` — clean.

---

### Session 64: Form Validation Audit & Fixes

**Audit scope:** Compared all frontend form validations against backend DTO annotations across 12 form pages.

**Fixes applied:**

1. **Users (`src/pages/Users.tsx`)** — `email` field now uses `required('Email')` + `email()` in both create and edit schemas (backend has `@NotBlank @Email`).

2. **Faculty (`src/pages/Faculty.tsx`)** — `department` field validation changed from `required + maxLength(100)` to just `maxLength(100)`. Removed red `*` indicator from label. Backend has no `@NotBlank` on department.

3. **Examinations (`src/pages/Examinations.tsx`)** — Added cross-field validation: start date must be before end date (backend validates `startDate < endDate` in `ExaminationService`).

4. **FacultyAssignments (`src/pages/FacultyAssignments.tsx`)** — Replaced fragile inline `showError()` checks with field-level validation state (`createErrors`). Fields now show `is-invalid` CSS class and inline error messages. Added academic year YYYY-YYYY format validation. Errors clear on field change.

5. **StudentEnrollmentHistory (`src/pages/StudentEnrollmentHistory.tsx`)** — Same pattern: replaced inline `showError()` with field-level `enrollErrors` state. Class and academic year fields now show `is-invalid` with inline messages. Added YYYY-YYYY format validation.

6. **LoadingSpinner/EmptyState catch-up** — Applied shared components to 3 files missed by background agents: `FacultyAssignments.tsx`, `StudentEnrollmentHistory.tsx`, `ClassEnrollments.tsx`.

**Already correct (no changes needed):**
- ExamSubjects — already had `passingMarks <= maxMarks` cross-field check
- ClassEnrollments close form — `exitReason` always has a value (pre-selected dropdown)
- Organizations, Branches, Classes, Students, ExamResults — validation schemas aligned with backend

**Verification:** `npm run lint` — 0 errors; `npm run build` — clean.

---

### Session 63: Align with Backend Section 31 — employeeId Now Optional

1. `src/types/faculty.ts` — Made `employeeId` optional (`?`) in `CreateFacultyRequest`, `UpdateFacultyRequest` (aligns with backend removing `@NotBlank` on employeeId).
2. `src/pages/Faculty.tsx` — Removed `required('Employee ID')` and `minLength(1)` validators from `employeeId` field; kept `maxLength(50)`. Removed red `*` required indicator from label.

**Context:** Backend Section 31 made `arkId` the sole unique identifier for Student and Faculty. `rollNumber` and `employeeId` are now optional display labels with no uniqueness constraint. Frontend `rollNumber` was already optional in types; `employeeId` needed this update.

**Verification:** `npm run lint` — 0 errors; `npm run build` — clean.

---

## 2026-03-11

### Session 62: User Manual

1. Generated comprehensive user manual as `ARK_User_Manual.docx` (Word document) covering:
   - Introduction and getting started (login, dashboard, navigation)
   - Role-based access control (4-tier hierarchy, full permissions matrix)
   - All management modules: Organizations, Branches, Classes, Students, Faculty, Users
   - Examinations & results (exams, subjects, results entry, class results, report cards)
   - Enrollments (class roster, student enrollment history)
   - Promotions & class progression (configuration, preview, execute workflow)
   - Audit logs (filters, action color codes)
   - 6 common workflows (onboard student, transfer, record results, promote, assign faculty, review performance)
   - Field validation reference table
   - Troubleshooting guide

---

### Session 61: Refactor — Replace Local Constant Arrays & Inline Options with Shared Imports

**Replaced local arrays with imports from `src/constants/statuses.ts`:**
1. `src/pages/FacultyAssignments.tsx` — Removed local `ASSIGNMENT_TYPES` array; added import of `ASSIGNMENT_TYPE_OPTIONS`; replaced both usages (create modal select, edit modal select).
2. `src/pages/ClassEnrollments.tsx` — Removed local `EXIT_REASONS` array; added import of `EXIT_REASON_OPTIONS`; replaced usage in close-enrollment modal select. `ExitReason` type import retained (still used for state type and cast).
3. `src/pages/StudentEnrollmentHistory.tsx` — Removed local `EXIT_REASONS` array; added import of `EXIT_REASON_OPTIONS`; replaced usage in close-enrollment modal select. `ExitReason` type import retained (still used for state type and cast).
4. `src/pages/Promotions.tsx` — Removed local `ACTIONS` const; added import of `PROMOTION_ACTIONS`; replaced usage in override action select in candidates table.
5. `src/pages/AuditLogs.tsx` — Left unchanged (its local `ACTIONS` array covers audit-specific actions: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, REGISTER — not in shared constants).

**Replaced hardcoded inline `<option>` elements with `.map()` over shared constants:**
6. `src/pages/Organizations.tsx` — `ORGANIZATION_STATUS_OPTIONS` for edit status select.
7. `src/pages/Branches.tsx` — `BRANCH_STATUS_OPTIONS` for edit status select.
8. `src/pages/Classes.tsx` — `CLASS_STATUS_OPTIONS` for edit status select.
9. `src/pages/Students.tsx` — `STUDENT_STATUS_OPTIONS` for status select, `GENDER_OPTIONS` for gender select.
10. `src/pages/Faculty.tsx` — `FACULTY_STATUS_OPTIONS` for status select, `GENDER_OPTIONS` for gender select.
11. `src/pages/FacultyAssignments.tsx` — `ASSIGNMENT_STATUS_OPTIONS` for edit modal status select.

**Completed LoadingSpinner/EmptyState adoption (from Session 60):**
12. Applied `<LoadingSpinner />` and `<EmptyState />` to remaining 11 pages: OrgStudents, ClassFacultyAssignments, FacultyPerformance, ClassProgression, Users, Examinations, ExamSubjects, ExamResults, ExamClassResults, AuditLogs, Dashboard.

**Verification:**
- `npm run lint` — 0 errors, 0 warnings
- `npm run build` — passes cleanly

---

### Session 60: Code Quality — Comprehensive "Fix All" Pass

**New shared components:**
1. `src/components/LoadingSpinner.tsx` — Shared loading spinner replacing 20+ duplicated spinner blocks across all pages.
2. `src/components/EmptyState.tsx` — Shared empty state component with configurable message, replacing duplicated empty-state blocks.

**New shared constants:**
3. `src/constants/statuses.ts` — Centralized status option arrays (`EXIT_REASON_OPTIONS`, `ASSIGNMENT_TYPE_OPTIONS`, `STUDENT_STATUS_OPTIONS`, `FACULTY_STATUS_OPTIONS`, `ORGANIZATION_STATUS_OPTIONS`, `BRANCH_STATUS_OPTIONS`, `CLASS_STATUS_OPTIONS`, `ENROLLMENT_STATUS_OPTIONS`, `ASSIGNMENT_STATUS_OPTIONS`, `GENDER_OPTIONS`, `PROMOTION_ACTIONS`).

**API client hardening:**
4. `src/api/client.ts` — Rewrote with:
   - Automatic token refresh on 401 responses with deduplication (single `refreshPromise`)
   - Retry with exponential backoff (`MAX_RETRIES=2`, delays `[1000, 3000]`)
   - Retryable status codes: 408, 429, 502, 503, 504
   - `Retry-After` header support for 429 responses
   - Centralized `clearAuth()` for logout + redirect on auth failure

**Auth context improvements:**
5. `src/context/AuthContext.tsx` — Rewrote with:
   - Proper dependency arrays (removed all `eslint-disable` for exhaustive-deps)
   - Ref-based stable callbacks (`loginSuccessRef`, `logoutRef`, `scheduleRefreshRef`)
   - Ref assignments inside `useEffect` to satisfy `react-hooks/refs` lint rule
   - Scheduled token refresh (timer-based, 60s before JWT expiry)
   - Immediate refresh when token is near-expiry on mount

**Modal accessibility:**
6. `src/components/Modal.tsx` — Rewrote with focus trap:
   - Tab/Shift+Tab cycling within dialog
   - Focus restoration to previously focused element on close
   - Auto-focus first focusable element on open
   - Fallback focus on dialog container

**Per-route error boundaries:**
7. `src/App.tsx` — Added `Page` wrapper component that wraps each lazy route with `ErrorBoundary` + `Suspense`, with optional `RoleGuard` integration. All 25+ routes now use this pattern.

**Bulk page updates:**
8. Updated all ~20 page files to use `<LoadingSpinner />` and `<EmptyState />` shared components instead of inline duplicated markup.
9. Updated pages with inline status arrays to import from `src/constants/statuses.ts`.

**Code comments:**
10. Added explanation comments for `eslint-disable` directives in `OrgStudents.tsx` (classNameMap dependency) and `Students.tsx` (academicYear destructuring).

**Verification:**
- `npm run lint` — 0 errors, 0 warnings
- `npm run build` — passes cleanly

---

### Session 59: Enrollment & Assignment API — Phase 6 (Wiring & Cleanup)

**Lint fix:**
1. `src/pages/FacultyPerformance.tsx` — Fixed `react-hooks/set-state-in-effect` lint error by refactoring inline `.then()` chain in `useEffect` to `useCallback` + async function pattern (consistent with all other pages).

**React key fix:**
2. `src/pages/FacultyPerformance.tsx` — Fixed missing React key on fragment inside `.map()` in subject-wise table. Replaced bare `<>` with `<Fragment key={subject.subjectName}>` to prevent runtime warnings.

**Accessibility improvements:**
3. `src/pages/Promotions.tsx` — Added `aria-label` to inline override action `<select>` and override reason `<input>` in the candidates table (per-student controls).
4. `src/pages/ClassProgression.tsx` — Added `aria-label` to inline class name `<input>` in the progression table.

**Verification:**
- `npm run lint` — 0 errors, 0 warnings
- `npm run build` — passes cleanly
- All new pages (phases 2–5) follow consistent patterns: toast, loading spinner, error alerts, pagination, `useCanWrite`, proper `RoleGuard` in routes
- All new sidebar-reachable navigation entries are drill-down pages accessed via action buttons on parent pages (Students → History, Classes → Roster/Faculty/Promote/Progression, Faculty → Assignments/Performance). No sidebar entries needed since all are contextual.

---

### Session 58: Enrollment & Assignment API — Phase 5 (Class Progression & Promotions)

**New pages:**
1. `src/pages/ClassProgression.tsx` — Configure class progression sequence for a branch. Features:
   - Editable ordered list of class levels (name, display order, terminal flag)
   - Add/remove/reorder levels with up/down arrows
   - Inline editing for class names and terminal checkbox
   - Validation (unique names, at least one terminal)
   - Visual progression path preview (badge chain with arrows)
   - Dirty state tracking with save button
   - Read-only mode for non-write users

2. `src/pages/Promotions.tsx` — Multi-step student promotion workflow:
   - **Step 1 (Config):** Set target academic year and optional section
   - **Step 2 (Preview):** Summary cards (total/promote/graduate/hold back/no data), full candidate table with recommendations, per-student override dropdowns with reason fields, highlighted overrides
   - **Step 3 (Results):** Execution summary cards, detailed promotion records table with ARK ID, name, action, reason

**Updated pages:**
3. `src/pages/Classes.tsx` — Added "Progression" button (page-level, navigates to branch progression config), "Promote" button per class row (navigates to promotions workflow).

**Routing:**
4. `src/App.tsx` — Added lazy imports for `ClassProgression` and `Promotions`. Added routes:
   - `/organizations/:orgId/branches/:branchId/class-progression` → class progression config (SA/OA/ADMIN)
   - `/organizations/:orgId/branches/:branchId/classes/:classId/promotions` → promotion workflow (SA/OA/ADMIN)

---

### Session 57: Enrollment & Assignment API — Phase 4 (Faculty Performance UI)

**New pages:**
1. `src/pages/FacultyPerformance.tsx` — Read-only performance dashboard for a faculty member. Features:
   - Summary cards (classes, subjects, students, avg marks, pass rate, grade count)
   - Overall grade distribution visualization
   - Class teacher info card (if applicable)
   - Subject-wise performance table with expandable class-level rows
   - Drill-down: Class detail panel (students, avg/highest/lowest marks, pass rate, grade distribution, exam-wise breakdown)
   - Drill-down: Subject detail panel (total classes/students, overall avg/pass rate, class breakdown table)
   - Academic year filter input

**Updated pages:**
2. `src/pages/Faculty.tsx` — Added "Performance" button per faculty row (navigates to org-level performance page).

**Routing:**
3. `src/App.tsx` — Added lazy import for `FacultyPerformance`. Added route:
   - `/organizations/:orgId/faculty/:facultyId/performance` → faculty performance dashboard (guarded by `facultyPerformance` permission: SA/OA/ADMIN)

---

### Session 56: Enrollment & Assignment API — Phase 3 (Faculty Assignment UI)

**New pages:**
1. `src/pages/FacultyAssignments.tsx` — Full CRUD for faculty assignments. Shows all assignments for a faculty member (class, subject, type, status). Create modal with class/year/type/subject fields. Edit modal for assignment type and status. Delete with confirmation.
2. `src/pages/ClassFacultyAssignments.tsx` — Read-only view of faculty assigned to a specific class. Shows faculty name, subject, type, status with pagination.

**Updated pages:**
3. `src/pages/Faculty.tsx` — Added "Assignments" button per faculty row (navigates using faculty's branchId). Actions column now always visible (not just for canWrite).
4. `src/pages/Classes.tsx` — Added "Faculty" button per class row, navigates to class faculty assignments page.

**Routing:**
5. `src/App.tsx` — Added lazy imports for `FacultyAssignments` and `ClassFacultyAssignments`. Added two new routes:
   - `/organizations/:orgId/branches/:branchId/faculty/:facultyId/assignments` → faculty assignments CRUD
   - `/organizations/:orgId/branches/:branchId/classes/:classId/faculty` → class faculty view

---

### Session 55: Enrollment & Assignment API — Phase 2 (Student Enrollment UI)

**New pages:**
1. `src/pages/StudentEnrollmentHistory.tsx` — Shows full enrollment history for a student, with "Enroll" action (when no active enrollment) and "Close Enrollment" action on active enrollments. Displays active enrollment banner, class name lookup, exit reason selection modal.
2. `src/pages/ClassEnrollments.tsx` — Class roster view showing all students enrolled via enrollment API, with pagination, student name lookup, and "Close" action on active enrollments.

**Updated pages:**
3. `src/pages/Students.tsx` — Added "History" button per student row, navigates to enrollment history page.
4. `src/pages/Classes.tsx` — Added "Roster" button per class row, navigates to class enrollments page.

**Routing:**
5. `src/App.tsx` — Added lazy imports for `StudentEnrollmentHistory` and `ClassEnrollments`. Added two new routes:
   - `/organizations/:orgId/branches/:branchId/students/:studentId/enrollments` → enrollment history
   - `/organizations/:orgId/branches/:branchId/classes/:classId/enrollments` → class roster

## 2026-03-08

### Session 54: Enrollment & Assignment API — Phase 1 (Types, API Layer, Config)

**New type files:**
1. `src/types/enrollment.ts` — `StudentEnrollmentResponse`, `CreateEnrollmentRequest`, `CloseEnrollmentRequest`, `EnrollmentStatus`, `ExitReason`
2. `src/types/facultyAssignment.ts` — `FacultyAssignmentResponse`, `CreateFacultyAssignmentRequest`, `UpdateFacultyAssignmentRequest`, `AssignmentType`, `AssignmentStatus`
3. `src/types/facultyPerformance.ts` — `FacultyPerformanceResponse`, `FacultyClassPerformanceResponse`, `FacultySubjectPerformanceResponse` + nested types (`PerformanceSummary`, `SubjectPerformance`, `ClassPerformance`, `ClassTeacherInfo`, `ExamBreakdown`, `ClassBreakdown`)
4. `src/types/classProgression.ts` — `ClassLevel`, `ClassProgressionRequest`, `ClassProgressionResponse`
5. `src/types/promotion.ts` — `PromotionPreviewResponse`, `PromotionExecuteRequest`, `PromotionExecuteResponse`, `PromotionCandidate`, `StudentOverride`, `PromotionSummary`, `PromotionRecordDto`, `SourceClassInfo`

**New API clients:**
6. `src/api/enrollmentApi.ts` — 6 functions: `createEnrollment`, `closeEnrollment`, `getEnrollmentsByBranch`, `getEnrollmentsByClass`, `getActiveEnrollment`, `getEnrollmentHistory`
7. `src/api/facultyAssignmentApi.ts` — 8 functions: `createFacultyAssignment`, `updateFacultyAssignment`, `deleteFacultyAssignment`, `getFacultyAssignmentById`, `getAssignmentsByBranch`, `getAssignmentsByClass`, `getAssignmentsByFaculty`, `getActiveAssignmentsByFaculty`
8. `src/api/facultyPerformanceApi.ts` — 3 functions: `getFacultyPerformance`, `getFacultyClassPerformance`, `getFacultySubjectPerformance`
9. `src/api/classProgressionApi.ts` — 2 functions: `getClassProgression`, `setClassProgression`
10. `src/api/promotionApi.ts` — 2 functions: `previewPromotion`, `executePromotion`

**Updated existing types:**
11. `src/types/student.ts` — Added `academicYear` field to `CreateStudentRequest`
12. `src/types/faculty.ts` — Restored `employeeId` as required in `CreateFacultyRequest`, `UpdateFacultyRequest`, and `FacultyFormData`

**Updated existing pages:**
13. `src/pages/Students.tsx` — Added `academicYear` to form (shown only on create, not edit), validation for YYYY-YYYY format
14. `src/pages/Faculty.tsx` — Added `employeeId` field back to form, EMPTY_FORM, schema, openEditModal, and submit handlers

**Config updates:**
15. `src/config/roles.ts` — Added permissions for `enrollments`, `facultyAssignments`, `facultyPerformance`, `classProgression`, `promotions` in both `ROLE_PERMISSIONS` and `WRITE_ROLES`
16. `src/components/StatusBadge.tsx` — Added badge styles for enrollment exit reasons (PROMOTED, HELD_BACK), assignment types (SUBJECT_TEACHER, CLASS_TEACHER, BOTH), promotion recommendations

**Docs updated:**
17. `docs/enrollment-assignment-api.md` — Fully rewritten to match actual Swagger spec (corrected endpoint paths, request/response schemas, enum values)

---

### Session 53: Org-Level Students Read-Only View

**New file:**
1. `src/pages/OrgStudents.tsx` — Read-only view of all students across the organization with branch + class filters, branch/class name columns, no CRUD actions

**Files modified:**
2. `src/App.tsx` — Added lazy import and route for OrgStudents at `/organizations/:orgId/students`
3. `src/components/layout/Sidebar.tsx` — Restored "Students" sidebar link for ORG_ADMIN (points to org-level view)

**Two student views now exist:**
- **Org-level** (`/organizations/:orgId/students`) — read-only, all branches, used by ORG_ADMIN sidebar
- **Branch-level** (`/organizations/:orgId/branches/:branchId/students`) — full CRUD, single branch, used by ADMIN sidebar and Branches drill-down

---

### Session 52: Students Mapped Inside Branch

**Route change:** `/organizations/:orgId/branches/:branchId/students` (branch-scoped CRUD)

**Files modified:**
1. `src/App.tsx` — Updated Students and StudentExams routes to include `:branchId`
2. `src/pages/Students.tsx` — Major refactor:
   - Uses `branchId` from URL params instead of filter dropdown
   - Removed branch filter, branch name map, admin branch scope, modal branch list
   - Removed `useAuth`, `getBranches`, `useAdminBranchScope` imports
   - Added `branchName` state from `getBranchById`
   - Form pre-sets `branchId` from URL; branch select removed from modal
   - Class filter remains as the only filter
   - Back button navigates to Classes page
   - Branch column removed from table
3. `src/pages/Branches.tsx` — Added "Students" button per branch row
4. `src/pages/StudentExams.tsx` — Gets `branchId` from URL params instead of fetching from student; back button updated
5. `src/pages/StudentReportCard.tsx` — Back button updated to include branchId
6. `src/components/layout/Sidebar.tsx` — Updated Students links to include branchId; ORG_ADMIN no longer has direct Students sidebar link (accessed via Branches drill-down)

**Navigation flow:** Branches → "Students" → Students (branch-scoped, class filter) → "Report Card" → StudentExams → StudentReportCard

---

### Session 51: Code Quality & Accessibility Improvements

**Fix #1: Truncated Pagination** (`src/components/Pagination.tsx`)
- Replaced rendering all page buttons with smart truncation (shows `1 ... 4 5 6 ... 100`)
- Prevents DOM bloat on large datasets; uses `useMemo` for page number calculation

**Fix #2: Duplicate Modal Escape Handler** (9 pages)
- Removed `useModalEscape` import and call from all CRUD pages — `Modal.tsx` already handles Escape key
- Pages: Organizations, Branches, Classes, Students, Faculty, Users, Examinations, ExamSubjects, ExamResults

**Fix #3: API Error Normalization** (`src/api/client.ts`)
- Added user-friendly error messages instead of leaking raw server errors
- Added 30s request timeout with `AbortController`
- Validation errors (400/422) pass through server messages; other errors use friendly defaults

**Fix #4: Debounced Department Filter** (`src/pages/Faculty.tsx`)
- Created `src/hooks/useDebounce.ts` hook (300ms default)
- Applied to Faculty department text filter to prevent API call on every keystroke

**Fix #5: Sidebar Toggle Accessibility** (`src/components/layout/Header.tsx`)
- Added `aria-expanded` attribute to sidebar toggle button

**Fix #6: Form Label Accessibility** (9 pages)

**Files modified:**
1. `src/pages/Organizations.tsx` — Added `htmlFor` to 7 labels and `id` to 7 form controls (name, address, contactEmail, contactPhone, website, logoUrl, status)
2. `src/pages/Branches.tsx` — Added `htmlFor` to 8 labels and `id` to 8 form controls (name, address, city, state, zipCode, contactEmail, contactPhone, status)
3. `src/pages/Classes.tsx` — Added `htmlFor` to 6 labels and `id` to 6 form controls (name, section, academicYear, capacity, description, status)
4. `src/pages/Students.tsx` — Added `htmlFor` to 17 labels and `id` to 17 form controls (branchId, classId, firstName, lastName, email, phone, dateOfBirth, gender, enrollmentDate, guardianName, guardianPhone, guardianEmail, address, city, state, zipCode, status)
5. `src/pages/Faculty.tsx` — Added `htmlFor` to 18 labels and `id` to 18 form controls (branchId, firstName, lastName, email, phone, dateOfBirth, gender, joiningDate, department, designation, qualifications, specializations, address, city, state, zipCode, status)
6. `src/pages/Users.tsx` — Added `htmlFor` to 7 labels and `id` to 7 form controls (fullName, email, password, role, branchId, department, status)
7. `src/pages/Examinations.tsx` — Added `htmlFor` to 7 labels and `id` to 7 form controls (name, academicYear, examType, startDate, endDate, description, status)
8. `src/pages/ExamSubjects.tsx` — Added `htmlFor` to 7 labels and `id` to 7 form controls (classId, subjectName, subjectCode, maxMarks, passingMarks, examDate, status)
9. `src/pages/ExamResults.tsx` — Added `htmlFor` to 4 labels and `id` to 4 form controls (studentId, marksObtained, remarks, status)

**Details:**
- Only modal form fields were modified; filter bar dropdowns were left untouched
- Used the `name` attribute value as the `id` value for each form control
- For status `<select>` elements (which lacked a `name` attribute), added `id="status"` and `htmlFor="status"`
- This improves accessibility by associating labels with their form controls

---

### Session 50: Student Filter in Class Results

**Files modified:**
1. `src/pages/ExamClassResults.tsx` — Added student-level filter dropdown to class results page
   - Changed from server-side pagination to fetching all results at once (size=1000)
   - Added `students` state populated from `getStudents` API (filtered by branch and class)
   - Added `filterStudentId` state with dropdown selector
   - Added `filteredResults` and `pagedResults` via `useMemo` for client-side filtering + pagination
   - Empty state message changes based on whether a filter is active

---

### Session 49: Class-Level Results Integration

**New file:**
1. `src/pages/ClassExams.tsx` — Exam picker page for a class: lists all exams for the branch, each row has "View Results" linking to the class results for that exam

**Files modified:**
2. `src/pages/Classes.tsx` — Added "Results" button per class row (visible to all roles); Actions column now always visible
3. `src/pages/ExamClassResults.tsx` — Added `branchId` state from exam; updated back button to navigate to class exam picker (`/branches/:branchId/classes/:classId/results`)
4. `src/App.tsx` — Added lazy-loaded route: `/organizations/:orgId/branches/:branchId/classes/:classId/results` → ClassExams

**Navigation flow:** Classes table → "Results" → ClassExams (pick exam) → ExamClassResults (view all results for that class)

---

### Session 48: Student-Level Report Card Integration

**New file:**
1. `src/pages/StudentExams.tsx` — Exam picker page: lists all exams for a student's branch, each row has "View Results" linking to the student's report card for that exam

**Files modified:**
2. `src/pages/Students.tsx` — Added "Report Card" button per student row (visible to all roles); Actions column now always visible
3. `src/pages/StudentReportCard.tsx` — Updated back button to navigate to student's exam list (`/students/:id/report-card`) instead of exam subjects
4. `src/App.tsx` — Added lazy-loaded route: `/organizations/:orgId/students/:studentId/report-card` → StudentExams

**Navigation flow:** Students table → "Report Card" → StudentExams (pick exam) → StudentReportCard (view results)

---

### Session 47: Integrate New Exam Results Endpoints — Class Results, Student Report Card

**New files:**
1. `src/pages/ExamClassResults.tsx` — Read-only page: all results for a class within an exam (class teacher view)
2. `src/pages/StudentReportCard.tsx` — Read-only report card: student's results across all subjects with summary (totals, percentage, overall pass/fail)

**API updated:**
3. `src/api/examinationApi.ts` — Added `getClassExamResults(orgId, examId, classId, page, size)` for the new `/classes/{classId}/results` endpoint

**Routes added:**
4. `src/App.tsx` — Added 2 new lazy-loaded routes:
   - `/organizations/:orgId/examinations/:examId/classes/:classId/results` → ExamClassResults
   - `/organizations/:orgId/examinations/:examId/students/:studentId/results` → StudentReportCard

**Navigation buttons added:**
5. `src/pages/ExamSubjects.tsx` — Added "Class Results" button per subject row (navigates to class results view)
6. `src/pages/ExamResults.tsx` — Added "Report Card" button per result row (navigates to student report card); Actions column now always visible (Report Card available to all roles)

---

### Session 46: Exam Class Results Page

1. Created `src/pages/ExamClassResults.tsx` — read-only page showing all exam results for a specific class within an exam
   - Route params: `organizationId`, `examId`, `classId`
   - Fetches exam details (for exam name and branchId), class exam results (paginated), exam subjects (for subject name and max marks lookup maps), students (for student name map), and academic classes (for class name)
   - Info banner showing class name and exam name
   - Table columns: Student, Subject, Marks (obtained / max), Grade, Status, Remarks
   - Back button navigates to `/organizations/${organizationId}/examinations/${examId}/subjects`
   - Breadcrumb shows exam name / class name
   - Uses `useToast`, `StatusBadge`, `Pagination`, `Toast` — no create/edit/delete functionality
   - Removed unused type imports (`ExamSubjectResponse`, `StudentResponse`, `AcademicClassResponse`) to pass strict TypeScript checks

---

### Session 45: Student Report Card Page

1. Created `src/pages/StudentReportCard.tsx` — read-only report card view showing a single student's results across all subjects in an exam
   - Route params: `organizationId`, `examId`, `studentId`
   - Fetches exam details, student exam results (flat array), exam subjects (for lookup maps), and students list (to resolve student name)
   - Info banner card showing student name/arkId and exam name/academic year
   - Results table with columns: Subject, Max Marks, Passing Marks, Marks Obtained, Grade, Status, Remarks
   - Summary footer row with total marks, overall percentage (1 decimal), and overall PASS/FAIL status
   - Back button navigates to exam subjects list
   - Uses `useToast`, `StatusBadge`, `Toast` — no create/edit/delete functionality

---

### Session 44: Enum Audit & StatusBadge Update

1. Audited all frontend enum values against backend — **all aligned correctly** (types, form dropdowns, API payloads)
2. `src/components/StatusBadge.tsx` — Added missing badge styles for examination statuses:
   - `SCHEDULED` → blue (`bg-primary`), `IN_PROGRESS` → yellow (`bg-warning`), `CANCELLED` → grey (`bg-secondary`)
   - `PASS` → green (`bg-success`), `FAIL` → red (`bg-danger`), `ABSENT` → grey (`bg-secondary`), `WITHHELD` → yellow (`bg-warning`)
3. `src/components/StatusBadge.tsx` — Added `formatStatus()` helper to display human-readable labels (e.g. `IN_PROGRESS` → "In Progress", `ON_LEAVE` → "On Leave") instead of raw uppercase enum values

---

### Session 43: Examinations Integration — Wiring Routes, Sidebar, and Roles

**New files created:**
1. `src/types/examination.ts` — Types for Examination, ExamSubject, ExamResult (request/response/status/enums)
2. `src/api/examinationApi.ts` — API client for all 3 exam entities (examinations, subjects, results)
3. `src/pages/Examinations.tsx` — Branch-level examinations CRUD with academic year filter
4. `src/pages/ExamSubjects.tsx` — Exam subjects CRUD with class dropdown, drill-down from examination
5. `src/pages/ExamResults.tsx` — Exam results CRUD with student dropdown, marks entry, grade display

**Files modified:**
6. `src/config/roles.ts` — Added `examinations` to `ROLE_PERMISSIONS` (all roles) and `WRITE_ROLES` (SUPER_ADMIN, ORG_ADMIN, ADMIN)
7. `src/App.tsx` — Added 3 lazy-loaded routes: examinations (branch-level), exam subjects, exam results
8. `src/components/layout/Sidebar.tsx` — Added Examinations nav link for ADMIN role (when branchId available)
9. `src/pages/Branches.tsx` — Added "Exams" action button in branches table for drill-down navigation

**Navigation flow:** Branches → Exams → Subjects → Results (hierarchical drill-down)

---

### Session 42: Create Exam Subjects CRUD Page

1. Created `src/pages/ExamSubjects.tsx` — Full CRUD page for exam subjects under a specific examination, following Classes.tsx patterns
   - Route params: `organizationId` and `examId` from useParams
   - Fetches exam details via `getExaminationById` to display exam name as breadcrumb and derive branchId
   - Back button navigates to `/organizations/${organizationId}/branches/${exam.branchId}/examinations`
   - Fetches classes for the exam's branch to populate classId dropdown and build classNameMap for table display
   - Table columns: Subject Name, Subject Code, Class (resolved via classNameMap), Max Marks, Passing Marks, Exam Date, Status, Actions
   - Actions: Results navigation button (always visible), Edit/Delete (canWrite-gated)
   - Create/Edit modal with fields: Class (required select), Subject Name (required), Subject Code (optional), Max Marks (required number), Passing Marks (required number, validated <= maxMarks), Exam Date (required date), Status (edit only)
   - Uses handleSelectChange/handleSelectBlur for select inputs, handleChange/handleBlur for text/number inputs
   - Uses all shared hooks and components (useToast, useModalEscape, useFormValidation, useCanWrite, StatusBadge, Pagination, Toast, ConfirmModal, Modal)
   - References `WRITE_ROLES.examinations` from roles config; form ID: `subject-form`

### Session 41: Create ExamResults CRUD Page

1. Created `src/pages/ExamResults.tsx` — full CRUD page for exam results under a specific exam subject
2. Route params: `organizationId`, `examId`, `subjectId` from useParams
3. Back button navigates to subjects list (`/organizations/:orgId/examinations/:examId/subjects`)
4. Header shows "Exam Results" title with exam name / subject name breadcrumb
5. Info banner displays subject name, max marks, and passing marks
6. Table columns: Student (resolved via studentNameMap), Marks Obtained (X / maxMarks format), Max Marks, Grade, Status, Remarks, Actions (Edit only)
7. Student name resolution: fetches students by exam's branchId, builds Map<id, "firstName lastName (arkId)">
8. Create modal: Student dropdown (required), Marks Obtained (required, 0–maxMarks), Remarks (optional, maxLength 500)
9. Edit modal: Student dropdown disabled, Marks Obtained, Remarks, plus Status select (PASS/FAIL/ABSENT/WITHHELD)
10. Follows Classes.tsx patterns: useCallback for closeModal/fetchResults, useModalEscape, useFormValidation, useCanWrite, import type for type-only imports, handleSelectChange/handleSelectBlur for selects

---

### Session 40: Create Examinations CRUD Page

1. Created `src/pages/Examinations.tsx` — Full CRUD page for branch-level examinations following the same patterns as Classes.tsx
   - Route params: `organizationId` and `branchId` from useParams
   - Back button navigates to branches list
   - Header with org name / branch name breadcrumb
   - Academic Year text input filter bar
   - Table with columns: ARK ID, Name, Academic Year, Type, Start Date, End Date, Status, Actions
   - Subjects navigation button per row, Edit/Delete buttons (canWrite-gated)
   - Create/Edit modal with fields: Name, Academic Year, Exam Type (dropdown), Start Date, End Date, Description, Status (edit only)
   - Uses all shared hooks (useToast, useModalEscape, useFormValidation, useCanWrite) and shared components (StatusBadge, Pagination, Toast, ConfirmModal, Modal)
   - API calls: getExaminations, createExamination, updateExamination, deleteExamination from examinationApi
   - Types imported from types/examination.ts

### Session 39: Add ARK ID to All Entities, Remove rollNumber/employeeId from Forms

**Types updated:**
1. `src/types/organization.ts` — Added `arkId: string` to `OrganizationResponse`
2. `src/types/branch.ts` — Added `arkId: string` to `BranchResponse`
3. `src/types/student.ts` — Added `arkId: string` to `StudentResponse`, made `rollNumber` optional, removed `rollNumber` from `CreateStudentRequest` and `UpdateStudentRequest`
4. `src/types/faculty.ts` — Added `arkId: string` to `FacultyResponse`, made `employeeId` optional, removed `employeeId` from `CreateFacultyRequest`, `UpdateFacultyRequest`, and `FacultyFormData`

**Tables updated (ARK ID column added as first column):**
5. `src/pages/Organizations.tsx` — Added ARK ID column with `<code>` styling
6. `src/pages/Branches.tsx` — Added ARK ID column with `<code>` styling
7. `src/pages/Students.tsx` — Replaced "Roll No" column with ARK ID column
8. `src/pages/Faculty.tsx` — Replaced "Employee ID" column with ARK ID column

**Forms updated:**
9. `src/pages/Students.tsx` — Removed rollNumber field from create/edit form, schema, and EMPTY_FORM
10. `src/pages/Faculty.tsx` — Removed employeeId field from create/edit form, schema, EMPTY_FORM, and submit data

---

### Session 38: Students Table — Display Branch & Class Names Instead of IDs

**File changed:** `src/pages/Students.tsx`

1. Added `branchNameMap` (useMemo) derived from `filterBranches` to resolve branch IDs to names
2. Added `classNameMap` state (Map) that accumulates class names as classes are fetched
3. Updated filter-classes useEffect to populate `classNameMap` alongside `filterClasses`
4. Added effect to resolve missing class names by fetching classes for branches not yet loaded
5. Table now displays `branchNameMap.get(id)` and `classNameMap.get(id)` with ID as fallback

---

### Session 37: Comprehensive Code Review — Build & Lint Verification

1. Ran `npm run build` — all 96 modules compiled successfully with no TypeScript errors
2. Ran `npm run lint` — zero lint warnings or errors
3. Confirmed all refactored pages (Organizations, Branches, Students, Faculty, Users, Classes) compile correctly after shared hook/component migration

---

### Session 36: Refactor Users & Classes Pages to Use Shared Hooks & Components

**Files changed:** `src/pages/Users.tsx`, `src/pages/Classes.tsx`

1. **Users.tsx** — Replaced manual toast state with `useToast()`, Escape handler with `useModalEscape()`, delete modal with `<ConfirmModal>`, create/edit modal with `<Modal>` (form id: `user-form`), removed `stableSchema` useMemo
2. **Classes.tsx** — Same refactoring: `useToast()`, `useModalEscape()`, `<ConfirmModal>`, `<Modal>` (form id: `class-form`), removed `stableSchema` useMemo

---

### Session 35: Refactor Faculty Page to Use Shared Hooks & Components

**File changed:** `src/pages/Faculty.tsx`

1. Replaced toast state with `useToast` hook
2. Replaced Escape key useEffect with `useModalEscape` hook
3. Replaced delete confirmation modal with `<ConfirmModal>` component
4. Replaced create/edit modal with `<Modal>` component (form id: `faculty-form`)
5. Removed `stableSchema` useMemo wrapper
6. Replaced ADMIN branch-scoping logic with `useAdminBranchScope` hook

---

### Session 34: Refactor Organizations & Branches Pages to Use Shared Hooks & Components

**Files changed:** `src/pages/Organizations.tsx`, `src/pages/Branches.tsx`

1. **Organizations.tsx** — Replaced manual toast state with `useToast()`, Escape handler with `useModalEscape()`, delete modal with `<ConfirmModal>`, create/edit modal with `<Modal>` (form id: `org-form`), removed `stableSchema` useMemo
2. **Branches.tsx** — Same refactoring: `useToast()`, `useModalEscape()`, `<ConfirmModal>`, `<Modal>` (form id: `branch-form`), removed `stableSchema` useMemo

---

### Session 33: Code Review Improvements — New Hooks, Components & Fixes

**New files created:**
1. `src/hooks/useToast.ts` — Reusable toast state hook (eliminates duplication across 6 pages)
2. `src/hooks/useModalEscape.ts` — Reusable Escape key handler hook (eliminates 6 duplicate useEffects)
3. `src/hooks/useAdminBranchScope.ts` — Reusable ADMIN branch-scoping hook (eliminates duplication in Students/Faculty)
4. `src/components/Modal.tsx` — Reusable modal with accessibility (`role="dialog"`, `aria-modal="true"`)
5. `src/components/ConfirmModal.tsx` — Reusable delete confirmation dialog built on Modal
6. `src/components/ErrorBoundary.tsx` — Class component error boundary with "Try Again" button

**Files modified:**
7. `src/utils/validators.ts` — Removed `any` default from `ValidationSchema<T>` generic
8. `src/components/Pagination.tsx` — Added `disabled` HTML attribute and `aria-label` on all buttons
9. `src/App.tsx` — Wrapped `<BrowserRouter>` with `<ErrorBoundary>`

---

### Session 32: Refactor Students Page to Use Shared Hooks & Components

**File changed:** `src/pages/Students.tsx`

**1. Replaced toast state with `useToast` hook**
- Removed manual `useState` for toast
- Now uses `const { toast, showSuccess, showError, dismiss } = useToast()`
- All `setToast` calls replaced with `showSuccess`/`showError`, `onClose` uses `dismiss`

**2. Replaced Escape key useEffect with `useModalEscape` hook**
- Removed manual `useEffect` block with `document.addEventListener('keydown', ...)`
- Replaced with `useModalEscape(showModal, closeModal)`

**3. Replaced delete confirmation modal HTML with `ConfirmModal` component**
- Removed inline `{deleteTarget && (...)}` block with manual modal markup
- Replaced with `<ConfirmModal>` component

**4. Replaced create/edit modal HTML with `Modal` component**
- Removed inline `{showModal && (...)}` block with manual modal markup
- Replaced with `<Modal>` component; form uses `id="student-form"` so footer submit button references it via `form="student-form"`
- All form fields preserved identically

**5. Removed `stableSchema` useMemo wrapper**
- Now passes `studentSchema` directly to `useFormValidation(studentSchema)`

**6. Replaced ADMIN branch-scoping logic with `useAdminBranchScope` hook**
- Removed `isAdmin` const, `branchLocked`/`setBranchLocked` state, and `getUserById` useEffect
- Replaced with `const { adminBranchId, branchLocked } = useAdminBranchScope(organizationId)`
- Added useEffect to set `filterBranchId` when `adminBranchId` changes
- Removed `getUserById` import

**7. Cleaned up imports**
- Removed `useMemo` from React imports
- Removed `getUserById` from userApi imports
- Added imports: `useToast`, `useModalEscape`, `useAdminBranchScope`, `ConfirmModal`, `Modal`

### Session 31: Refactor Faculty Page to Use Shared Hooks & Components

**1. Replaced toast state with `useToast` hook**
- Removed manual `useState` for toast
- Now uses `const { toast, showSuccess, showError, dismiss } = useToast()`
- All `setToast` calls replaced with `showSuccess`/`showError`, `onClose` uses `dismiss`

**2. Replaced Escape key useEffect with `useModalEscape` hook**
- Removed manual `useEffect` block with `document.addEventListener('keydown', ...)`
- Replaced with `useModalEscape(showModal, closeModal)`

**3. Replaced delete confirmation modal HTML with `ConfirmModal` component**
- Removed inline `{deleteTarget && (...)}` block with manual modal markup
- Replaced with `<ConfirmModal isOpen={!!deleteTarget} onClose={...} onConfirm={handleDelete} message={...} detail="This action cannot be undone." loading={deleting} />`

**4. Replaced create/edit modal HTML with `Modal` component**
- Removed inline `{showModal && (...)}` block with manual modal markup
- Replaced with `<Modal isOpen={showModal} onClose={closeModal} title={...} footer={...}>`
- Form uses `id="faculty-form"` so the submit button in Modal's footer references it via `form="faculty-form"`
- All form fields preserved identically

**5. Removed `stableSchema` useMemo wrapper**
- Removed `const stableSchema = useMemo(() => facultySchema, [])`
- Now passes `facultySchema` directly to `useFormValidation(facultySchema)`

**6. Replaced ADMIN branch-scoping logic with `useAdminBranchScope` hook**
- Removed `isAdmin` const, `branchLocked`/`setBranchLocked` state, and `getUserById` useEffect
- Replaced with `const { adminBranchId, branchLocked } = useAdminBranchScope(organizationId)`
- Added useEffect to set `filterBranchId` when `adminBranchId` changes
- Removed `getUserById` import

**7. Cleaned up imports**
- Removed `useMemo` from React imports
- Removed `getUserById` from userApi imports
- Added imports: `useToast`, `useModalEscape`, `useAdminBranchScope`, `ConfirmModal`, `Modal`

### Session 30: Refactor Users & Classes Pages to Use Shared Hooks & Components

**Files changed:** `src/pages/Users.tsx`, `src/pages/Classes.tsx`

**1. Replaced toast state with `useToast` hook**
- Removed `useState<{ message: string; type: 'success' | 'error' } | null>(null)` from both files
- Imported `useToast` from `src/hooks/useToast.ts`
- Replaced all `setToast({ message, type: 'success' })` with `showSuccess(...)`, `setToast({ ..., type: 'error' })` with `showError(...)`, `onClose={() => setToast(null)}` with `onClose={dismiss}`

**2. Replaced inline Escape key handler with `useModalEscape` hook**
- Removed the `useEffect` that manually attached/detached `keydown` listener from both files
- Imported and called `useModalEscape(showModal, closeModal)` in component body

**3. Replaced delete confirmation modal HTML with `ConfirmModal` component**
- Removed the entire `{deleteTarget && (...)}` block with manual modal markup from both files
- Imported `ConfirmModal` from `src/components/ConfirmModal.tsx`

**4. Replaced create/edit modal HTML with `Modal` component**
- Removed the entire `{showModal && (...)}` block with manual modal markup from both files
- Imported `Modal` from `src/components/Modal.tsx`
- Users form uses `id="user-form"`, Classes form uses `id="class-form"` so footer submit buttons reference them via `form=` attribute

**5. Removed unnecessary `useMemo` on schema constants**
- Users.tsx: Moved `createSchema` and `editSchema` to module-level constants, removed `stableCreateSchema`/`stableEditSchema` useMemo wrappers
- Classes.tsx: Removed `const stableSchema = useMemo(() => classSchema, [])`, now passes `classSchema` directly to `useFormValidation`

**6. Cleaned up unused imports**
- Users.tsx: Removed `useEffect` dependency on `useMemo` for schemas (kept `useMemo` for `branchNameMap` which still needs it)
- Classes.tsx: Removed `useMemo` from React imports entirely

### Session 29: Refactor Organizations Page to Use Shared Hooks & Components

**1. Replaced inline toast state with `useToast` hook**
- Removed `useState<{ message: string; type: 'success' | 'error' } | null>(null)`
- Imported `useToast` from `src/hooks/useToast.ts`
- Replaced all `setToast({ message, type: 'success' })` with `showSuccess(...)`, `setToast({ ..., type: 'error' })` with `showError(...)`, `onClose={() => setToast(null)}` with `onClose={dismiss}`

**2. Replaced inline Escape key handler with `useModalEscape` hook**
- Removed the `useEffect` that manually attached/detached `keydown` listener
- Imported and called `useModalEscape(showModal, closeModal)` in component body

**3. Replaced delete confirmation modal HTML with `ConfirmModal` component**
- Removed the entire `{deleteTarget && (...)}` block with manual modal markup
- Imported `ConfirmModal` from `src/components/ConfirmModal.tsx`

**4. Replaced create/edit modal HTML with `Modal` component**
- Removed the entire `{showModal && (...)}` block with manual modal markup
- Imported `Modal` from `src/components/Modal.tsx`
- Form uses `id="org-form"` so footer submit button references it via `form="org-form"`

**5. Removed `stableSchema` useMemo wrapper**
- Deleted `const stableSchema = useMemo(() => orgSchema, [])` line
- Now passes `orgSchema` directly to `useFormValidation(orgSchema)`
- Removed `useMemo` from React imports

### Session 28: Refactor Branches Page to Use Shared Hooks & Components

**1. Replaced toast state with `useToast` hook**
- Removed manual `useState<{ message: string; type: 'success' | 'error' } | null>` for toast
- Now uses `const { toast, showSuccess, showError, dismiss } = useToast()` from `src/hooks/useToast.ts`
- All `setToast({ message, type: 'success' })` calls replaced with `showSuccess(message)`
- All `setToast({ message, type: 'error' })` calls replaced with `showError(message)`
- `onClose={() => setToast(null)}` replaced with `onClose={dismiss}`

**2. Replaced Escape key useEffect with `useModalEscape` hook**
- Removed the manual `useEffect` block with `document.addEventListener('keydown', ...)` for Escape key handling
- Replaced with `useModalEscape(showModal, closeModal)` from `src/hooks/useModalEscape.ts`

**3. Replaced delete confirmation modal HTML with `ConfirmModal` component**
- Removed the inline `{deleteTarget && (...)}` block with manual modal markup
- Replaced with `<ConfirmModal isOpen={!!deleteTarget} onClose={...} onConfirm={handleDelete} message={...} detail="This action cannot be undone." loading={deleting} />`

**4. Replaced create/edit modal HTML with `Modal` component**
- Removed the inline `{showModal && (...)}` block with manual modal markup
- Replaced with `<Modal isOpen={showModal} onClose={closeModal} title={...} footer={...}>` wrapping the form
- Form uses `id="branch-form"` attribute so the submit button in `Modal`'s footer can reference it via `form="branch-form"`
- All form fields preserved identically

**5. Removed `stableSchema` useMemo wrapper**
- `const stableSchema = useMemo(() => branchSchema, [])` removed
- Now passes `branchSchema` directly to `useFormValidation(branchSchema)`

**6. Cleaned up imports**
- Removed `useMemo` from React imports (no longer needed)
- Added imports: `useToast`, `useModalEscape`, `ConfirmModal`, `Modal`

### Session 27: ADMIN Branch-Scoped Data Filtering

**1. ADMIN now sees only their assigned branch's data**
- Root cause: Students/Faculty pages showed all branches in the org for ADMIN users
- Since auth response lacks `branchId`, pages now fetch the ADMIN's user profile via `getUserById` to get their assigned `branchId`

**2. Updated Students page (`src/pages/Students.tsx`)**
- On mount, fetches ADMIN's user profile to get `branchId`
- Auto-sets branch filter to ADMIN's assigned branch
- Disables branch dropdown (locked) — ADMIN cannot switch to other branches
- "All Branches" option hidden when locked

**3. Updated Faculty page (`src/pages/Faculty.tsx`)**
- Same ADMIN auto-scoping as Students page
- Branch filter locked to assigned branch, dropdown disabled

### Session 26: Fix ADMIN Sidebar Navigation

**1. Fixed ADMIN sidebar showing no management links (`src/components/layout/Sidebar.tsx`)**
- Root cause: sidebar required `branchId` for ADMIN, but auth response doesn't include it
- ADMIN now sees Students and Faculty links using `orgId` (no `branchId` dependency)
- Classes link still requires `branchId` — shown only when available
- Navigation for ADMIN: Dashboard, Students, Faculty, (Classes if branchId), Academic Records, Reports

### Session 25: Fix ADMIN Dashboard Empty State

**1. Root cause: backend `UserInfo` (auth response) does not include `branchId`**
- Only `UserResponse` (users API) has `branchId`; auth's `UserInfo` has: id, fullName, email, role, organizationId
- ADMIN role had `branchId` undefined → branch dashboard skipped → org dashboard fetched but render guard checked `isOrgAdmin` → nothing displayed

**2. Made `branchId` optional in `UserInfo` (`src/types/auth.ts`)**
- Changed `branchId: string` → `branchId?: string` to match actual backend auth response

**3. Fixed Dashboard rendering logic (`src/pages/Dashboard.tsx`)**
- Removed strict role-based render guards (`isOrgAdmin`, `isBranchScoped`)
- Now uses data availability: if `branchData` exists → show branch view, if `orgData` exists → show org view
- ADMIN/USER without `branchId` correctly falls back to org dashboard
- When backend adds `branchId` to auth response, branch dashboard will automatically activate

### Session 24: Branch Dashboard API Integration from Swagger

**1. Verified branch dashboard API against Swagger (`GET /api/v1/dashboard/organization/{orgId}/branch/{branchId}`)**
- Compared `BranchDashboardResponse` type with actual backend schema

**2. Added `ClassMetric` type (`src/types/dashboard.ts`)**
- New type: `{ classId, className, section, count }`

**3. Updated `BranchDashboardResponse` to match backend (`src/types/dashboard.ts`)**
- Added missing fields: `organizationId`, `facultyByDepartment`, `studentsPerClass`

**4. Updated `BranchDashboard` component (`src/pages/Dashboard.tsx`)**
- Added "Faculty by Department" breakdown card
- Added "Students per Class" metric table (shows class name with section)

### Session 23: Branch-Level Dashboard View

**1. Added `BranchDashboardResponse` type (`src/types/dashboard.ts`)**
- Branch-scoped stats: totalClasses, totalStudents, totalFaculty
- Breakdowns: studentsByStatus, studentsByGender, facultyByStatus
- Recent activity feed

**2. Added `getBranchDashboard` API (`src/api/dashboardApi.ts`)**
- `GET /api/v1/dashboard/organization/{orgId}/branch/{branchId}`

**3. Updated Dashboard with 3-tier view (`src/pages/Dashboard.tsx`)**
- **Super Admin** → Platform overview (all orgs)
- **Org Admin** → Organization overview (all branches)
- **Admin / User** → Branch overview with quick-action cards (Classes, Students, Faculty)
- Branch dashboard shows subtitle: "Branch Name — Organization Name"
- Quick actions: Manage/View Classes, Students, Faculty (write label based on role)

### Session 22: Role-Based Management Hierarchy

**1. Defined management hierarchy per role**
- **Super Admin** → manages all Organizations (drill-down to branches/students/etc)
- **Org Admin** → manages all Branches, Students, Faculty, Users within their org
- **Admin** → manages their assigned Branch (Classes, Students, Faculty)
- **User** → read-only access to Students and Faculty

**2. Added `branchId` to `UserInfo` (`src/types/auth.ts`)**
- Admin and User roles are scoped to a specific branch via `branchId`

**3. Updated `ROLE_PERMISSIONS` (`src/config/roles.ts`)**
- Branches access restricted to Super Admin and Org Admin only (Admin manages single branch, not the list)
- Admin/User no longer see Branches listing route

**4. Rewrote Sidebar navigation per role (`src/components/layout/Sidebar.tsx`)**
- Super Admin: Dashboard, Organizations, Academic Records, Reports, Audit Logs
- Org Admin: Dashboard, Branches, Students, Faculty, Users, Academic Records, Reports
- Admin: Dashboard, Classes (branch-scoped), Students, Faculty, Academic Records, Reports
- User: Dashboard, Students, Faculty, Academic Records, Reports

### Session 21: Org-Level Sidebar Navigation & Role-Aware Back Buttons

**1. Updated Sidebar with org-scoped navigation (`src/components/layout/Sidebar.tsx`)**
- Non-Super Admin users now see org-scoped nav items: Branches, Students, Faculty, Users
- Links use the user's `organizationId` from auth context (e.g., `/organizations/{orgId}/branches`)
- Super Admin continues to see Organizations link (navigates into orgs to manage sub-resources)

**2. Fixed role-aware back buttons on 4 pages**
- Updated `Branches.tsx`, `Students.tsx`, `Faculty.tsx`, `Users.tsx`
- Super Admin: "Back to Organizations" → navigates to `/organizations`
- Non-Super Admin: "Back to Dashboard" → navigates to `/`
- Added `useAuth` import and `isSuperAdmin` check to each page

**3. Integrated Dashboard metrics (from previous session)**
- `src/api/dashboardApi.ts` — Platform and org-level dashboard API calls
- `src/types/dashboard.ts` — Types for PlatformDashboardResponse, OrgDashboardResponse, OrgMetric, BranchMetric, RecentActivity
- `src/pages/Dashboard.tsx` — Role-based dashboard: PlatformDashboard (Super Admin) and OrgDashboard (others) with StatCards, BreakdownCards, MetricTables, and ActivityList

## 2026-03-07

### Session 1: Project Scaffolding & Layout Setup

**1. Created CLAUDE.md**
- Added project overview, tech stack, commands, architecture, TypeScript config notes, and domain context from BRD

**2. Built responsive layout with Bootstrap**
- Created `src/components/layout/` with Header, Sidebar, Footer, and Layout components
- Each component has its own external CSS file
- Header: fixed top navbar with sidebar toggle button and brand link
- Sidebar: 250px fixed sidebar, slides in/out on mobile (<992px), always visible on desktop (>=992px), overlay on mobile to close
- Footer: pinned to bottom of content area
- Cleaned up default Vite template styles in `index.css` and `App.css`

**3. Set up routing with react-router-dom**
- Installed `react-router-dom`
- Created placeholder page components in `src/pages/`: Dashboard, Organizations, Users, AcademicRecords, Reports, NotFound
- Configured `BrowserRouter` in `App.tsx` with all routes nested under `<Layout />`
- Layout uses `<Outlet />` to render child routes
- Sidebar uses `<NavLink>` for client-side navigation with active link highlighting
- Header brand uses `<Link>` for SPA navigation
- Added 404 catch-all route

**Routes:**
| Path | Page |
|------|------|
| `/` | Dashboard |
| `/organizations` | Organizations |
| `/users` | Users |
| `/academic-records` | Academic Records |
| `/reports` | Reports |
| `*` | 404 Not Found |

**File structure after changes:**
```
src/
├── App.tsx
├── App.css
├── index.css
├── main.tsx
├── components/
│   └── layout/
│       ├── Header.tsx / Header.css
│       ├── Sidebar.tsx / Sidebar.css
│       ├── Footer.tsx / Footer.css
│       └── Layout.tsx / Layout.css
└── pages/
    ├── Dashboard.tsx
    ├── Organizations.tsx
    ├── Users.tsx
    ├── AcademicRecords.tsx
    ├── Reports.tsx
    └── NotFound.tsx
```

### Session 2: Fixed Sidebar Toggle & UI Redesign

**1. Fixed sidebar toggle not working**
- Root cause: CSS media query was forcing `transform: translateX(0)` on large screens, overriding the toggle state
- Replaced media-query-based visibility with state-driven class (`sidebar-open` on `.app-layout`)
- Sidebar now defaults to open on load and can be toggled on all screen sizes
- On small screens (<992px), sidebar overlays content; on large screens, content shifts with margin

**2. Redesigned Header**
- Replaced Bootstrap navbar classes with custom styled header
- Dark gradient background (`#1e293b` to `#0f172a`) with subtle box shadow
- Animated hamburger icon: 3 bars morph into an X when sidebar is open
- Brand section with purple gradient icon square + "ARK" text with letter spacing
- Profile avatar circle in header-right with hover ring effect
- Header now receives `isSidebarOpen` prop for hamburger animation state

**3. Redesigned Sidebar**
- Removed Bootstrap utility classes, fully custom CSS
- Dark gradient background matching header
- Nav items with icon + label, rounded 8px containers
- Active link: purple gradient background with left inset border indicator
- Hover state with subtle white background
- Smooth cubic-bezier transition for open/close
- Backdrop blur on overlay for mobile
- Nav items defined as data array for cleaner markup

**4. Redesigned Footer**
- Light background (`#fff`) with top border, subtle gray text
- Clean minimal style replacing the dark Bootstrap footer

**5. Updated global styles**
- Light gray page background (`#f1f5f9`)
- Added Inter font family as primary

### Session 3: Fixed Sidebar Behavior

**1. Sidebar no longer closes on nav click (desktop)**
- Root cause: every `NavLink` had `onClick={onClose}` which closed the sidebar on all screen sizes
- Added `handleNavClick` that checks `window.innerWidth` — only closes sidebar on mobile (<992px)

**2. Overlay no longer blocks main content on desktop**
- Root cause: overlay was conditionally rendered with `{isOpen && ...}` which appeared on all screen sizes
- Overlay is now always in the DOM but hidden by default (`opacity: 0; pointer-events: none`)
- Uses `d-lg-none` Bootstrap class so it's `display: none` on large screens
- On mobile, `.sidebar-overlay.visible` activates it with opacity transition

### Session 4: Backend API Integration & Organizations CRUD

**1. Created API client layer**
- `src/api/client.ts` — Generic fetch wrapper with `get`, `post`, `put` helpers; base URL configurable via `VITE_API_BASE_URL` env var (defaults to `http://localhost:8080`)
- `src/api/organizationApi.ts` — Organization-specific API functions: `getOrganizations` (paginated), `getOrganizationById`, `createOrganization`, `updateOrganization`

**2. Created TypeScript types from Swagger spec**
- `src/types/organization.ts` — Types matching backend schemas: `OrganizationResponse`, `CreateOrganizationRequest`, `UpdateOrganizationRequest`, `OrganizationStatus` enum, generic `PageResponse<T>`

**3. Built Organizations page with full CRUD**
- Table view with Name, Email, Phone, Status columns, styled with custom CSS
- Color-coded status badges (green/gray/red for Active/Inactive/Suspended)
- "New Organization" button opens create modal
- "Edit" button per row opens edit modal (includes status dropdown)
- Pagination controls for paginated API responses
- Loading spinner and empty state handling
- Error alert display
- Custom modal (not Bootstrap JS) with backdrop blur

**Backend API endpoints consumed:**
| Method | Endpoint | Usage |
|--------|----------|-------|
| GET | `/api/v1/organizations?page=&size=` | List with pagination |
| GET | `/api/v1/organizations/{id}` | Get by ID |
| POST | `/api/v1/organizations` | Create new |
| PUT | `/api/v1/organizations/{id}` | Update existing |

**New files:**
```
src/
├── api/
│   ├── client.ts
│   └── organizationApi.ts
├── types/
│   └── organization.ts
└── pages/
    ├── Organizations.tsx  (rewritten)
    └── Organizations.css  (new)
```

### Session 5: Fixed CORS Issue

**1. Added Vite dev server proxy**
- Added `server.proxy` config in `vite.config.ts` to forward `/api` requests to `http://localhost:8080`
- This avoids CORS since the browser makes requests to the same origin (`localhost:5173`)

**2. Updated API client base URL**
- Changed default `BASE_URL` from `http://localhost:8080` to `''` (empty string)
- In dev, relative paths like `/api/v1/organizations` are proxied by Vite
- For production, set `VITE_API_BASE_URL` env var to the actual backend URL

### Session 6: Added Form Validations to Organization Modal

**1. Added `validateForm` function with field-level rules**
- **Name**: required, min 2 chars, max 100 chars
- **Email**: optional, must match email regex pattern
- **Phone**: optional, must match phone regex (7-20 digits, allows `+`, spaces, dashes, parens)
- **Website**: optional, must start with `http://` or `https://`
- **Logo URL**: optional, must start with `http://` or `https://`
- **Address**: optional, max 255 chars

**2. Validation UX behavior**
- Errors shown on blur (field touched) — not while typing
- Once a field is touched, re-validates on every keystroke for immediate feedback
- On submit, all fields are marked touched and validated; form won't submit if errors exist
- Uses Bootstrap `is-invalid` / `is-valid` / `invalid-feedback` classes for styling
- Form uses `noValidate` to disable browser-native validation in favor of custom

**3. Added placeholder text to all form inputs for guidance**

### Session 7: Extracted Generic Reusable Form Validation

**1. Created `src/utils/validators.ts` — composable validator functions**
- Primitive validators: `required(label)`, `minLength(n)`, `maxLength(n)`, `email()`, `phone()`, `url()`, `pattern(regex, msg)`
- `composeValidators(...fns)` — chains multiple validators, returns first error
- `createFormValidator(schema)` — builds a full-form validate function from a schema
- `validateField(schema, field, value)` — validates a single field
- All generics accept any interface (no index signature required)

**2. Created `src/hooks/useFormValidation.ts` — reusable React hook**
- Takes a `ValidationSchema<T>` and returns:
  - `errors` — current field error messages
  - `touched` — set of touched fields
  - `isValid` — boolean shorthand
  - `validateAll(values)` — marks all fields touched, validates everything, returns errors
  - `touchAndValidateField(field, value)` — for onBlur
  - `revalidateField(field, value)` — for onChange (only if already touched)
  - `fieldClass(field)` — returns Bootstrap class string (`form-control`, `is-valid`, `is-invalid`)
  - `reset()` — clears all errors and touched state

**3. Refactored Organizations page to use generic utilities**
- Replaced inline `validateForm`, `FormErrors`, regex constants, and manual touched/error state
- Defined `orgSchema` using composable validators
- All validation logic now driven by schema + hook

**Usage pattern for any new page:**
```tsx
import { required, email, composeValidators } from '../utils/validators.ts'
import { useFormValidation } from '../hooks/useFormValidation.ts'

const schema: ValidationSchema<MyFormType> = {
  name: composeValidators(required('Name'), minLength(2)),
  email: email(),
}
const { errors, touched, validateAll, fieldClass, ... } = useFormValidation(schema)
```

**New files:**
```
src/
├── utils/
│   └── validators.ts
└── hooks/
    └── useFormValidation.ts
```

### Session 8: Moved Common CSS to Global Stylesheets

**1. Created `src/styles/` directory with reusable global CSS**
- `modal.css` — `.modal-backdrop-custom`, `.modal-dialog-custom`, `.modal-header-custom`, `.modal-body-custom`, `.modal-footer-custom`
- `table.css` — `.app-table` with styled thead/tbody (replaces `.org-table`)
- `page.css` — `.page-container` (max-width 1200px) and `.page-title` (replaces `.org-page`, `.org-title`)

**2. Imported global styles in `main.tsx`**
- Import order: Bootstrap > `index.css` > `modal.css` > `table.css` > `page.css`

**3. Updated Organizations page**
- Replaced page-specific class names: `org-page` -> `page-container`, `org-title` -> `page-title`, `org-table` -> `app-table`
- Removed `Organizations.css` import and deleted the file

**Global class names available for all pages:**
| Class | Purpose |
|-------|---------|
| `.page-container` | Page wrapper with max-width |
| `.page-title` | Consistent page heading style |
| `.app-table` | Styled table with header/row hover |
| `.modal-backdrop-custom` | Full-screen modal overlay |
| `.modal-dialog-custom` | Modal content container |
| `.modal-header-custom` | Modal title row |
| `.modal-body-custom` | Modal form body |
| `.modal-footer-custom` | Modal action buttons row |

### Session 9: Branch CRUD & Pagination Fix

**1. Updated pagination types to match new backend `PagedModel` shape**
- Replaced `PageResponse<T>` (flat fields) with `PagedResponse<T>` containing nested `page: PageMetadata`
- `PageMetadata` has `size`, `number`, `totalElements`, `totalPages`
- Updated `organizationApi.ts` return type and `Organizations.tsx` to read `data.page.totalPages`

**2. Created Branch types (`src/types/branch.ts`)**
- `BranchResponse` — id, organizationId, name, address, city, state, zipCode, contactEmail, contactPhone, status, timestamps
- `CreateBranchRequest` — name, address, city, state, zipCode, contactEmail, contactPhone
- `UpdateBranchRequest` — all fields optional + status (ACTIVE/INACTIVE)

**3. Created Branch API (`src/api/branchApi.ts`)**
- `getBranches(orgId, page, size)` — paginated list
- `getBranchById(orgId, branchId)` — single branch
- `createBranch(orgId, data)` — create new
- `updateBranch(orgId, branchId, data)` — update existing

**4. Created Branches page (`src/pages/Branches.tsx`)**
- Routed at `/organizations/:organizationId/branches`
- Fetches and displays organization name in header
- "Back to Organizations" navigation button
- Table with Name, City, State, Email, Phone, Status columns
- Create/Edit modal with fields: Name*, Address, City, State, Zip Code, Contact Email, Contact Phone, Status (edit only)
- Validation schema using reusable validators: required+minLength+maxLength for name, maxLength for address/city/state, pattern for zipCode, email(), phone()
- Pagination controls

**5. Updated Organizations page**
- Added "Branches" button per org row that navigates to `/organizations/{id}/branches`

**6. Added route in App.tsx**
- `organizations/:organizationId/branches` -> `<Branches />`

**Backend API endpoints consumed:**
| Method | Endpoint | Usage |
|--------|----------|-------|
| GET | `/api/v1/organizations/{orgId}/branches?page=&size=` | List branches (paginated) |
| GET | `/api/v1/organizations/{orgId}/branches/{branchId}` | Get branch by ID |
| POST | `/api/v1/organizations/{orgId}/branches` | Create branch |
| PUT | `/api/v1/organizations/{orgId}/branches/{branchId}` | Update branch |

**New files:**
```
src/
├── types/
│   └── branch.ts
├── api/
│   └── branchApi.ts
└── pages/
    └── Branches.tsx
```

### Session 10: Improved Phone Number Validation

**1. Strengthened `phone()` validator in `src/utils/validators.ts`**
- Previous regex allowed strings with no actual digits (e.g. spaces, dots only)
- Now validates in 3 steps: format check (regex), minimum 7 digits, maximum 15 digits
- Digit count is checked after stripping all non-digit characters
- Applies globally to both Organization and Branch forms (uses shared validator)

### Session 11: Code Review — Implement All 14 Improvements

**1. Extracted shared pagination types to `src/types/common.ts`**
- Moved `PageMetadata` and `PagedResponse<T>` out of `organization.ts` into a shared module
- Updated imports in `organizationApi.ts` and `branchApi.ts` to use `common.ts`

**2. Enhanced API client (`src/api/client.ts`)**
- Added try/catch around `fetch()` for network error handling
- Added `del<T>()` method for DELETE requests

**3. Created reusable `StatusBadge` component (`src/components/StatusBadge.tsx`)**
- Replaced inline `statusBadge()` functions in Organizations and Branches pages
- Maps status strings to Bootstrap badge classes

**4. Created reusable `Pagination` component (`src/components/Pagination.tsx`)**
- Replaced ~30 duplicated pagination lines in each page
- Props: `page`, `totalPages`, `onPageChange`

**5. Created `Toast` component (`src/components/Toast.tsx` + `Toast.css`)**
- Auto-dismissing success/error notifications with slide-in animation
- Integrated into Organizations and Branches pages for create/update feedback

**6. Fixed stale closure in `useFormValidation` hook**
- Moved `touchedRef.current = touched` into a `useEffect` to satisfy React lint rule (no ref writes during render)

**7. Added Escape key handler to modals**
- Both Organizations and Branches modals now close on Escape keypress
- Wrapped `closeModal` in `useCallback` to satisfy exhaustive-deps rule

**8. Fixed shadowed `errors` variable in `handleSubmit`**
- Renamed local `errors` to `validationErrors` in both pages to avoid shadowing `formErrors`

**9. Replaced `{ ...form, [name]: value }` with functional `setForm` update**
- Both pages now use `setForm((prev) => ({ ...prev, [name]: value }))` in `handleChange`

**10. Updated Sidebar to use `matchMedia` instead of `window.innerWidth`**
- More reliable responsive check in `handleNavClick`

**11. Removed unnecessary `header-profile` wrapper div in Header**

**12. Added `React.lazy()` + `Suspense` code splitting in `App.tsx`**
- All page components are now lazy-loaded with spinner fallback
- Reduces initial bundle size (pages split into separate chunks)

**13. Deleted empty `src/App.css`**

**Build verification:** `npm run build` and `npm run lint` both pass cleanly (0 errors, 0 warnings)

### Session 12: Delete API Integration

**1. Fixed API client to handle empty response bodies (`src/api/client.ts`)**
- DELETE endpoints return 200 with no body; `response.json()` would fail on empty responses
- Now reads `response.text()` first and only parses JSON if body is non-empty

**2. Added delete functions to API layers**
- `deleteOrganization(id)` in `src/api/organizationApi.ts` — `DELETE /api/v1/organizations/{id}`
- `deleteBranch(organizationId, branchId)` in `src/api/branchApi.ts` — `DELETE /api/v1/organizations/{organizationId}/branches/{branchId}`

**3. Integrated delete into Organizations page (`src/pages/Organizations.tsx`)**
- Added "Delete" button (red outline) in actions column
- Delete confirmation modal with warning about cascading branch removal
- Toast notification on success/error
- Auto-refreshes list after successful delete

**4. Integrated delete into Branches page (`src/pages/Branches.tsx`)**
- Added "Delete" button (red outline) in actions column
- Delete confirmation modal with irreversibility warning
- Toast notification on success/error
- Auto-refreshes list after successful delete

**Build verification:** `npm run build` and `npm run lint` both pass cleanly (0 errors, 0 warnings)

### Session 13: Students & Academic Classes Integration

**1. Created Academic Classes feature (full CRUD)**
- `src/types/academicClass.ts` — Types: `AcademicClassStatus`, `AcademicClassResponse`, `CreateAcademicClassRequest`, `UpdateAcademicClassRequest`
- `src/api/academicClassApi.ts` — API layer: `getAcademicClasses`, `getAcademicClassById`, `createAcademicClass`, `updateAcademicClass`, `deleteAcademicClass` (nested under org + branch)
- `src/pages/Classes.tsx` — Full CRUD page at route `/organizations/:organizationId/branches/:branchId/classes`
  - Breadcrumb showing org name / branch name
  - "Back to Branches" navigation
  - Table: Name, Section, Academic Year, Capacity, Status, Actions (Edit, Delete)
  - Create/Edit modal with validation: Name (required 2-100), Section (maxLength 20), Academic Year (required, YYYY-YYYY pattern), Capacity (required, positive integer), Description (maxLength 500)
  - Status dropdown (ACTIVE/INACTIVE/COMPLETED) on edit only
  - Delete confirmation, Toast, Pagination, Escape key handler

**2. Created Students feature (full CRUD)**
- `src/types/student.ts` — Types: `StudentStatus`, `StudentResponse`, `CreateStudentRequest`, `UpdateStudentRequest`
- `src/api/studentApi.ts` — API layer: `getStudents` (with optional branchId/classId query filters), `getStudentById`, `createStudent`, `updateStudent`, `deleteStudent`
- `src/pages/Students.tsx` — Full CRUD page at route `/organizations/:organizationId/students`
  - Org name header display
  - "Back to Organizations" navigation
  - **Filter bar** with Branch and Class cascading dropdowns (selecting branch loads classes, both optional)
  - Table: Roll No, Name, Email, Phone, Branch, Class, Status, Actions (Edit, Delete)
  - Create/Edit modal with fields in logical rows:
    - Branch/Class cascading dropdowns (required)
    - Roll Number (required), First Name (required 2-50), Last Name (required 2-50)
    - Email, Phone with validators
    - Date of Birth, Gender dropdown, Enrollment Date (date inputs)
    - Guardian Name, Guardian Phone, Guardian Email
    - Address, City, State, Zip Code
    - Status dropdown on edit only (ACTIVE/INACTIVE/GRADUATED/TRANSFERRED/DROPPED)
  - Delete confirmation, Toast, Pagination, Escape key handler

**3. Updated StatusBadge (`src/components/StatusBadge.tsx`)**
- Added mappings: `COMPLETED` → `bg-info`, `GRADUATED` → `bg-primary`, `TRANSFERRED` → `bg-warning`, `DROPPED` → `bg-danger`

**4. Updated routing (`src/App.tsx`)**
- Added lazy-loaded routes for Classes and Students pages

**5. Added navigation links between pages**
- Organizations page: added "Students" button per row → `/organizations/{id}/students`
- Branches page: added "Classes" button per row → `/organizations/{orgId}/branches/{branchId}/classes`

**Backend API endpoints consumed:**
| Method | Endpoint | Usage |
|--------|----------|-------|
| GET | `/api/v1/organizations/{orgId}/branches/{branchId}/classes?page=&size=` | List classes (paginated) |
| GET | `/api/v1/organizations/{orgId}/branches/{branchId}/classes/{classId}` | Get class by ID |
| POST | `/api/v1/organizations/{orgId}/branches/{branchId}/classes` | Create class |
| PUT | `/api/v1/organizations/{orgId}/branches/{branchId}/classes/{classId}` | Update class |
| DELETE | `/api/v1/organizations/{orgId}/branches/{branchId}/classes/{classId}` | Delete class |
| GET | `/api/v1/organizations/{orgId}/students?branchId=&classId=&page=&size=` | List students (filtered, paginated) |
| GET | `/api/v1/organizations/{orgId}/students/{studentId}` | Get student by ID |
| POST | `/api/v1/organizations/{orgId}/students` | Create student |
| PUT | `/api/v1/organizations/{orgId}/students/{studentId}` | Update student |
| DELETE | `/api/v1/organizations/{orgId}/students/{studentId}` | Delete student |

**New files:**
```
src/
├── types/
│   ├── academicClass.ts
│   └── student.ts
├── api/
│   ├── academicClassApi.ts
│   └── studentApi.ts
└── pages/
    ├── Classes.tsx
    └── Students.tsx
```

**Build verification:** `npm run build` and `npm run lint` both pass cleanly (0 errors, 0 warnings)

### Session 14: Faculty Integration

**1. Created Faculty feature (full CRUD)**
- `src/types/faculty.ts` — Types: `FacultyStatus`, `FacultyResponse`, `CreateFacultyRequest`, `UpdateFacultyRequest`, `FacultyFormData` (with qualifications/specializations as comma-separated strings for form input)
- `src/api/facultyApi.ts` — API layer: `getFaculty` (with optional branchId/department query filters), `getFacultyById`, `createFaculty`, `updateFaculty`, `deleteFaculty`
- `src/pages/Faculty.tsx` — Full CRUD page at route `/organizations/:organizationId/faculty`
  - Org name header display, "Back to Organizations" navigation
  - **Filter bar** with Branch dropdown and Department text input (both optional, reset page on change)
  - Table: Employee ID, Name, Department, Designation, Email, Phone, Status, Actions (Edit, Delete)
  - Create/Edit modal with fields in 8 logical rows:
    - Branch dropdown (required) + Employee ID (required)
    - First Name + Last Name (required, 2-50 chars)
    - Email + Phone with validators
    - Date of Birth, Gender dropdown, Joining Date (date inputs)
    - Department (required) + Designation
    - Qualifications + Specializations (comma-separated text inputs with helper text, converted to string arrays on submit)
    - Address
    - City, State, Zip Code
    - Status dropdown on edit only (ACTIVE/INACTIVE/ON_LEAVE/RESIGNED/TERMINATED)
  - Delete confirmation, Toast, Pagination, Escape key handler

**2. Updated StatusBadge (`src/components/StatusBadge.tsx`)**
- Added mappings: `ON_LEAVE` → `bg-warning`, `RESIGNED` → `bg-secondary`, `TERMINATED` → `bg-danger`

**3. Updated routing (`src/App.tsx`)**
- Added lazy-loaded route for Faculty page

**4. Added navigation link from Organizations page**
- "Faculty" button per org row → `/organizations/{id}/faculty`

**Backend API endpoints consumed:**
| Method | Endpoint | Usage |
|--------|----------|-------|
| GET | `/api/v1/organizations/{orgId}/faculty?branchId=&department=&page=&size=` | List faculty (filtered, paginated) |
| GET | `/api/v1/organizations/{orgId}/faculty/{facultyId}` | Get faculty by ID |
| POST | `/api/v1/organizations/{orgId}/faculty` | Create faculty |
| PUT | `/api/v1/organizations/{orgId}/faculty/{facultyId}` | Update faculty |
| DELETE | `/api/v1/organizations/{orgId}/faculty/{facultyId}` | Delete faculty |

**New files:**
```
src/
├── types/
│   └── faculty.ts
├── api/
│   └── facultyApi.ts
└── pages/
    └── Faculty.tsx
```

**Build verification:** `npm run build` and `npm run lint` both pass cleanly (0 errors, 0 warnings)

### Session 15: Layout Content Area Fix

**1. Fixed content area not filling available space (`src/styles/page.css`)**
- Removed `max-width: 1200px` from `.page-container`, set `width: 100%` so content fills the available width
- Added `flex: 1` to `.app-content > main` so the main area stretches vertically between header and footer

### Session 16: JWT Authentication & Login Page

**1. Created auth types (`src/types/auth.ts`)**
- `UserRole` (SUPER_ADMIN, ORG_ADMIN, ADMIN, USER), `UserInfo`, `LoginRequest`, `AuthResponse`, `RefreshTokenRequest`

**2. Created auth API (`src/api/authApi.ts`)**
- `login(data)` — POST `/api/v1/auth/login`, returns AuthResponse with tokens + user info
- `refreshToken(data)` — POST `/api/v1/auth/refresh`, refreshes expired access token
- Custom error handling: 401 → "Invalid email or password"

**3. Created auth context (`src/context/AuthContext.tsx` + `src/context/authContextValue.ts`)**
- `AuthProvider` wraps the app, stores user/tokens in React state + localStorage
- On mount, checks JWT expiry and auto-refreshes if within 1 minute of expiring
- `loginSuccess(auth)` — stores tokens and user info
- `logout()` — clears all stored auth data
- Context and types split into separate file from provider component (react-refresh lint rule)

**4. Created `useAuth` hook (`src/hooks/useAuth.ts`)**
- Returns `{ user, accessToken, isAuthenticated, loginSuccess, logout }`
- Separated from context file to satisfy ESLint react-refresh/only-export-components rule

**5. Updated API client (`src/api/client.ts`)**
- Automatically attaches `Authorization: Bearer <token>` header to all API requests
- On 401 response: clears stored auth, redirects to `/login`

**6. Created Login page (`src/pages/Login.tsx` + `src/pages/Login.css`)**
- Dark gradient background with centered card
- Brand icon + "ARK - Academic Record Keeper" header
- Email + password fields with validation
- Spinner on submit button while authenticating
- Error alert for invalid credentials or network errors
- Redirects to dashboard on successful login

**7. Created ProtectedRoute component (`src/components/ProtectedRoute.tsx`)**
- Wraps protected content, redirects to `/login` if not authenticated

**8. Updated routing (`src/App.tsx`)**
- `/login` route outside layout (public, redirects to `/` if already logged in)
- All other routes wrapped in `ProtectedRoute` → `Layout`
- Extracted `AppRoutes` component to use `useAuth` inside BrowserRouter

**9. Updated Header (`src/components/layout/Header.tsx` + `Header.css`)**
- Shows logged-in user's full name, role badge, and initials avatar
- "Logout" button that clears auth and redirects to login
- User name and role hidden on mobile, visible on tablet+

**10. Updated main.tsx**
- Wrapped `<App />` in `<AuthProvider>`

**New files:**
```
src/
├── types/
│   └── auth.ts
├── api/
│   └── authApi.ts
├── context/
│   ├── authContextValue.ts
│   └── AuthContext.tsx
├── hooks/
│   └── useAuth.ts
├── components/
│   └── ProtectedRoute.tsx
└── pages/
    ├── Login.tsx
    └── Login.css
```

**Build verification:** `npm run build` and `npm run lint` both pass cleanly (0 errors, 0 warnings)

### Session 17: Users Management Integration

**1. Created User types (`src/types/user.ts`)**
- `UserStatus` (ACTIVE/INACTIVE/LOCKED), re-exports `UserRole` from auth.ts
- `UserResponse`, `CreateUserRequest`, `UpdateUserRequest`, `UserFormData`

**2. Created User API (`src/api/userApi.ts`)**
- `getUsers(orgId, page, size, branchId?)` with optional branch filter
- `getUserById`, `createUser`, `updateUser`, `deleteUser`

**3. Rewrote Users page (`src/pages/Users.tsx`)**
- Route changed from `/users` to `/organizations/:organizationId/users` (users are org-scoped)
- Org name header, "Back to Organizations" navigation
- Branch filter dropdown
- Table: Full Name, Email, Role (color-coded badge), Branch (name lookup), Department, Status, Actions
- Role badges: SUPER_ADMIN=danger, ORG_ADMIN=primary, ADMIN=info, USER=secondary
- Create/Edit modal: Full Name, Email, Password (required on create, optional on edit), Role dropdown, Branch dropdown, Department, Status (edit only)
- Password omitted from update request when blank
- Two validation schemas: create (password required+minLength 8) vs edit (password optional)
- Delete confirmation, Toast, Pagination, StatusBadge, Escape key handler

**4. Updated StatusBadge** — Added `LOCKED: 'bg-danger'`

**5. Updated routing (`src/App.tsx`)** — Changed users route to `/organizations/:organizationId/users`

**6. Added "Users" button on Organizations page** — navigates to `/organizations/{id}/users`

**7. Updated Sidebar (`src/components/layout/Sidebar.tsx`)** — Removed `/users` top-level link (users are now accessed per-organization)

**8. Fixed auth API error handling (`src/api/authApi.ts`)** — Parses JSON `message` field from error response instead of dumping raw JSON

**Backend API endpoints consumed:**
| Method | Endpoint | Usage |
|--------|----------|-------|
| GET | `/api/v1/organizations/{orgId}/users?branchId=&page=&size=` | List users (filtered, paginated) |
| GET | `/api/v1/organizations/{orgId}/users/{userId}` | Get user by ID |
| POST | `/api/v1/organizations/{orgId}/users` | Create user |
| PUT | `/api/v1/organizations/{orgId}/users/{userId}` | Update user |
| DELETE | `/api/v1/organizations/{orgId}/users/{userId}` | Delete user |

**New files:**
```
src/
├── types/
│   └── user.ts
└── api/
    └── userApi.ts
```

**Build verification:** `npm run build` and `npm run lint` both pass cleanly (0 errors, 0 warnings)

### Session 18: Audit Logs Integration (Super Admin Only)

**1. Created Audit Log types (`src/types/auditLog.ts`)**
- `AuditAction` (CREATE/UPDATE/DELETE/LOGIN/LOGOUT/REGISTER)
- `AuditLogResponse` with all fields from Swagger

**2. Created Audit Log API (`src/api/auditLogApi.ts`)**
- `getAuditLogs(page, size, organizationId?, action?, entityType?, userId?)` — read-only, all filters optional

**3. Created Audit Logs page (`src/pages/AuditLogs.tsx`)**
- Route: `/audit-logs` (platform-level, not org-scoped)
- Read-only table — no create/edit/delete
- **Filter bar:** Organization dropdown, Action dropdown, Entity Type text input, User ID text input, Clear Filters button
- Table: Timestamp, Action (color-coded badge), Entity Type, Entity Name, Performed By (email), Role, Details
- Action badges: CREATE=green, UPDATE=blue, DELETE=red, LOGIN=cyan, LOGOUT=gray, REGISTER=yellow
- Details column truncated with ellipsis for long text
- Pagination (20 per page)

**4. Updated Sidebar with role-based visibility (`src/components/layout/Sidebar.tsx`)**
- Nav items now support an optional `roles` array
- "Audit Logs" link only visible to `SUPER_ADMIN` users
- Uses `useAuth` hook to read current user's role
- Filters nav items with `useMemo` based on user role

**5. Updated routing (`src/App.tsx`)**
- Added lazy-loaded route for `/audit-logs`

**Backend API endpoints consumed:**
| Method | Endpoint | Usage |
|--------|----------|-------|
| GET | `/api/v1/audit-logs?organizationId=&action=&entityType=&userId=&page=&size=` | List audit logs (filtered, paginated) |

**New files:**
```
src/
├── types/
│   └── auditLog.ts
├── api/
│   └── auditLogApi.ts
└── pages/
    └── AuditLogs.tsx
```

**Build verification:** `npm run build` and `npm run lint` both pass cleanly (0 errors, 0 warnings)

### Session 19: Role-Based Display of Screens

**1. Created role permissions config (`src/config/roles.ts`)**
- `ROLE_PERMISSIONS` — defines which roles can access each feature/route
- `WRITE_ROLES` — defines which roles can create/edit/delete within each feature
- `hasRole(userRole, allowedRoles)` utility function
- Permission matrix:
  | Feature | SUPER_ADMIN | ORG_ADMIN | ADMIN | USER |
  |---------|:-:|:-:|:-:|:-:|
  | Organizations | R/W | - | - | - |
  | Branches | R/W | R/W | R | R |
  | Classes | R/W | R/W | R/W | R |
  | Students | R/W | R/W | R/W | R |
  | Faculty | R/W | R/W | R/W | R |
  | Users | R/W | R/W | - | - |
  | Audit Logs | R | - | - | - |
  | Dashboard/Reports | R | R | R | R |

**2. Created `RoleGuard` component (`src/components/RoleGuard.tsx`)**
- Wraps routes to enforce role-based access
- Redirects to `/` if user's role is not in the allowed list

**3. Created `useCanWrite` hook (`src/hooks/useCanWrite.ts`)**
- Returns boolean indicating if current user has write access for a feature
- Used by all CRUD pages to conditionally show/hide write actions

**4. Updated routing (`src/App.tsx`)**
- All restricted routes now wrapped in `<RoleGuard roles={ROLE_PERMISSIONS.<feature>}>`
- Direct URL access by unauthorized roles redirects to dashboard

**5. Updated Sidebar (`src/components/layout/Sidebar.tsx`)**
- Now uses `ROLE_PERMISSIONS` from shared config instead of inline role arrays
- Nav items filtered by user's role using `hasRole` utility

**6. Added write permission checks to all 6 CRUD pages**
- Organizations, Branches, Classes, Students, Faculty, Users
- "+ New ..." button hidden when `canWrite` is false
- Edit/Delete buttons hidden when `canWrite` is false
- Organizations & Branches: navigation buttons (Branches/Students/Faculty/Users, Classes) remain always visible
- Classes, Students, Faculty, Users: entire Actions column hidden for read-only users

**New files:**
```
src/
├── config/
│   └── roles.ts
├── components/
│   └── RoleGuard.tsx
└── hooks/
    └── useCanWrite.ts
```

**Build verification:** `npm run build` and `npm run lint` both pass cleanly (0 errors, 0 warnings)

### Session 20: Dashboard Metrics Integration

**1. Created Dashboard types (`src/types/dashboard.ts`)**
- `OrgMetric`, `BranchMetric`, `RecentActivity`
- `PlatformDashboardResponse` — cross-org totals, breakdowns by status/role, per-org metrics, recent activity
- `OrgDashboardResponse` — single org totals, student/faculty/class breakdowns by branch, recent activity

**2. Created Dashboard API (`src/api/dashboardApi.ts`)**
- `getPlatformDashboard()` — `GET /api/v1/dashboard/platform` (Super Admin)
- `getOrgDashboard(orgId)` — `GET /api/v1/dashboard/organization/{orgId}` (Org Admin/Admin/User)

**3. Rewrote Dashboard page (`src/pages/Dashboard.tsx`)**
- **Role-based view:** Super Admin sees platform dashboard, all other roles see their org dashboard
- **Stat cards:** Top-level metrics in colored cards (Organizations, Branches, Students, Faculty, Users, Classes)
- **Breakdown cards:** Horizontal progress-bar charts for status/role/gender distributions
- **Metric tables:** Per-org or per-branch counts for students, faculty, branches, classes
- **Recent activity feed:** Action badges (color-coded), entity type/name, performer email, relative timestamps ("5m ago", "2h ago")
- Reusable sub-components: `StatCard`, `BreakdownCard`, `MetricTable`, `ActivityList`
- Async data fetching with cancellation cleanup to prevent state updates on unmounted component

**Backend API endpoints consumed:**
| Method | Endpoint | Usage |
|--------|----------|-------|
| GET | `/api/v1/dashboard/platform` | Platform-wide metrics (Super Admin) |
| GET | `/api/v1/dashboard/organization/{orgId}` | Organization metrics (all roles) |

**New files:**
```
src/
├── types/
│   └── dashboard.ts
└── api/
    └── dashboardApi.ts
```

**Build verification:** `npm run build` and `npm run lint` both pass cleanly (0 errors, 0 warnings)
