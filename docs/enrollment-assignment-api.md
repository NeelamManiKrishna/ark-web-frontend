# Student Enrollment & Faculty Assignment — Frontend Integration Guide

## Overview

This document covers the new API changes from Swagger (verified against `http://localhost:8080/v3/api-docs`):

1. **StudentEnrollment** — tracks student-to-class relationships per academic year
2. **FacultyAssignment** — connects faculty to classes and subjects per academic year
3. **FacultyPerformance** — derived metrics from exam results across assignments
4. **ClassProgression** — defines class ordering within a branch for promotions
5. **Promotions** — preview and execute student promotions

All entities follow the pattern: **separate identity from assignment.** A student or faculty member is a permanent entity. Their connection to a class/subject is temporal and tracked per academic year.

---

## Part 1: Student Enrollment

### Why This Change

Previously, `Student.classId` was a single mutable field. When a student was promoted, the old value was overwritten — history lost. Now, enrollment is a separate entity that tracks every class a student has been in, when they joined, when they left, and why.

> **Note:** The current Swagger still returns `classId` on `StudentResponse`. This may be the active enrollment's classId for convenience, or may be deprecated. The enrollment system is the source of truth.

### Data Model

**StudentEnrollment** (new entity):

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier |
| `arkId` | string | ARK system ID |
| `organizationId` | string | Tenant isolation |
| `branchId` | string | Branch of the class |
| `studentId` | string | References Student |
| `classId` | string | References AcademicClass |
| `academicYear` | string | e.g., "2025-2026" |
| `enrolledAt` | date | When the student joined this class |
| `exitedAt` | date | When the student left (null if still active) |
| `exitReason` | enum | Why they left (null if still active) |
| `status` | enum | ACTIVE or COMPLETED |
| `createdAt` | datetime | Record creation timestamp |
| `updatedAt` | datetime | Last update timestamp |

### Enums

**EnrollmentStatus:**
| Value | Description |
|---|---|
| `ACTIVE` | Student is currently enrolled in this class |
| `COMPLETED` | Enrollment ended (promoted, graduated, transferred, etc.) |

**ExitReason:**
| Value | Description |
|---|---|
| `PROMOTED` | Student was promoted to the next class |
| `GRADUATED` | Student completed the terminal class |
| `HELD_BACK` | Student was held back (not promoted) |
| `TRANSFERRED` | Student transferred to another branch/school |
| `DROPPED` | Student dropped out |

**StudentStatus** (updated — on StudentResponse):
| Value | Description |
|---|---|
| `ACTIVE` | Active student |
| `INACTIVE` | Temporarily inactive |
| `GRADUATED` | Completed education |
| `TRANSFERRED` | Transferred out |
| `DROPPED` | Dropped out |

### Constraints

- A student can have **only one ACTIVE enrollment at a time**
- Unique index: `{studentId, academicYear}` — one class per student per academic year
- A student can have **many COMPLETED enrollments** (one per year they attended)

---

### API Endpoints — Student Enrollment

Base: `/api/v1/organizations/{organizationId}/branches/{branchId}/enrollments`

#### Create Enrollment

**POST** `/api/v1/organizations/{organizationId}/branches/{branchId}/enrollments`

| Field | Type | Required | Description |
|---|---|---|---|
| `studentId` | string | Yes | Student to enroll |
| `classId` | string | Yes | Class to enroll in |
| `academicYear` | string | Yes | Academic year (e.g., "2025-2026") |
| `enrolledAt` | date | No | When enrolled (defaults to today) |

**Response (201):** `StudentEnrollmentResponse`

**Errors:** `404` (student/class not found), `409` (already has active enrollment)

---

#### Close Enrollment

**PUT** `/api/v1/organizations/{organizationId}/branches/{branchId}/enrollments/{enrollmentId}/close`

| Field | Type | Required | Description |
|---|---|---|---|
| `exitReason` | enum | Yes | PROMOTED, GRADUATED, HELD_BACK, TRANSFERRED, DROPPED |
| `exitedAt` | date | No | When exited (defaults to today) |

**Response (200):** `StudentEnrollmentResponse` with status=COMPLETED

---

#### Get Enrollments by Branch and Year

**GET** `/api/v1/organizations/{organizationId}/branches/{branchId}/enrollments?academicYear={year}`

- `academicYear` — **required** query parameter
- Returns paginated `StudentEnrollmentResponse` list

---

#### Get Enrollments by Class

**GET** `/api/v1/organizations/{organizationId}/branches/{branchId}/enrollments/class/{classId}`

- Returns paginated `StudentEnrollmentResponse` list (all years for this class)

---

#### Get Active Enrollment for Student

**GET** `/api/v1/organizations/{organizationId}/branches/{branchId}/enrollments/student/{studentId}/active`

- Returns single `StudentEnrollmentResponse` or `404` if no active enrollment

---

#### Get Enrollment History for Student

**GET** `/api/v1/organizations/{organizationId}/branches/{branchId}/enrollments/student/{studentId}/history`

- Returns array of `StudentEnrollmentResponse` (all enrollments, ordered by academic year)

---

#### Create Student (Modified)

**POST** `/api/v1/organizations/{organizationId}/students`

Now accepts optional `classId` and `academicYear` to create the initial enrollment alongside the student.

| Field | Type | Required | Description |
|---|---|---|---|
| `branchId` | string | Yes | Branch the student belongs to |
| `firstName` | string | Yes | Student's first name |
| `lastName` | string | Yes | Student's last name |
| `classId` | string | No | Class to enroll in (creates enrollment) |
| `academicYear` | string | Conditional | Required if `classId` is provided |
| `rollNumber` | string | No | Roll number |
| All other fields | Various | No | Personal and guardian info |

---

#### Endpoint Summary — Student Enrollment

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| POST | `.../branches/{branchId}/enrollments` | Enroll student in a class | SA, OA, ADMIN |
| PUT | `.../branches/{branchId}/enrollments/{enrollmentId}/close` | Close enrollment | SA, OA, ADMIN |
| GET | `.../branches/{branchId}/enrollments?academicYear=` | Branch enrollments by year | All |
| GET | `.../branches/{branchId}/enrollments/class/{classId}` | Class enrollments | All |
| GET | `.../branches/{branchId}/enrollments/student/{studentId}/active` | Active enrollment | All |
| GET | `.../branches/{branchId}/enrollments/student/{studentId}/history` | Enrollment history | All |

---

## Part 2: Faculty Assignment

### Data Model

**FacultyAssignment** (new entity):

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier |
| `arkId` | string | ARK system ID |
| `organizationId` | string | Tenant isolation |
| `branchId` | string | Branch of the class |
| `facultyId` | string | References Faculty |
| `classId` | string | References AcademicClass |
| `subjectName` | string | What they teach (null for CLASS_TEACHER) |
| `academicYear` | string | e.g., "2025-2026" |
| `assignmentType` | enum | SUBJECT_TEACHER, CLASS_TEACHER, or BOTH |
| `status` | enum | ACTIVE or COMPLETED |
| `createdAt` | datetime | Record creation timestamp |
| `updatedAt` | datetime | Last update timestamp |

### Enums

**AssignmentType:**
| Value | Description |
|---|---|
| `SUBJECT_TEACHER` | Teaches a specific subject in a class |
| `CLASS_TEACHER` | Homeroom/class teacher |
| `BOTH` | Class teacher who also teaches a subject |

**AssignmentStatus:**
| Value | Description |
|---|---|
| `ACTIVE` | Currently assigned |
| `COMPLETED` | Academic year ended or assignment archived |

### Constraints

- Unique index: `{facultyId, classId, subjectName, academicYear}` — no duplicate assignments
- A class can have **only one CLASS_TEACHER** (or BOTH) per academic year
- A faculty member can be CLASS_TEACHER for **at most one class** per academic year
- A faculty member can be SUBJECT_TEACHER for **multiple classes** simultaneously

---

### API Endpoints — Faculty Assignment

Base: `/api/v1/organizations/{organizationId}/branches/{branchId}/faculty-assignments`

#### Create Faculty Assignment

**POST** `/`

| Field | Type | Required | Description |
|---|---|---|---|
| `facultyId` | string | Yes | Faculty member to assign |
| `classId` | string | Yes | Class to assign to |
| `academicYear` | string | Yes | Academic year |
| `assignmentType` | enum | Yes | SUBJECT_TEACHER, CLASS_TEACHER, or BOTH |
| `subjectName` | string | Conditional | Required for SUBJECT_TEACHER and BOTH |

**Response (201):** `FacultyAssignmentResponse`

**Errors:** `404` (faculty/class not found), `409` (duplicate assignment)

---

#### Update Faculty Assignment

**PUT** `/{assignmentId}`

| Field | Type | Required | Description |
|---|---|---|---|
| `assignmentType` | enum | No | SUBJECT_TEACHER, CLASS_TEACHER, or BOTH |
| `status` | enum | No | ACTIVE or COMPLETED |

**Response (200):** `FacultyAssignmentResponse`

---

#### Delete Faculty Assignment

**DELETE** `/{assignmentId}`

---

#### Get Assignment by ID

**GET** `/{assignmentId}`

**Response (200):** `FacultyAssignmentResponse`

---

#### Get Assignments by Branch and Year

**GET** `/?academicYear={year}`

- `academicYear` — **required**
- Returns paginated `FacultyAssignmentResponse` list

---

#### Get Assignments by Class

**GET** `/class/{classId}?academicYear={year}`

- `academicYear` — **required**
- Returns paginated `FacultyAssignmentResponse` list

---

#### Get All Assignments for Faculty

**GET** `/faculty/{facultyId}`

- Returns paginated `FacultyAssignmentResponse` list (all years)

---

#### Get Active Assignments for Faculty

**GET** `/faculty/{facultyId}/active`

- Returns array of `FacultyAssignmentResponse` (only ACTIVE status)

---

#### Endpoint Summary — Faculty Assignment

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| POST | `.../faculty-assignments/` | Create assignment | OA, ADMIN |
| PUT | `.../faculty-assignments/{assignmentId}` | Update assignment | OA, ADMIN |
| DELETE | `.../faculty-assignments/{assignmentId}` | Delete assignment | OA, ADMIN |
| GET | `.../faculty-assignments/{assignmentId}` | Get by ID | All |
| GET | `.../faculty-assignments/?academicYear=` | Branch assignments by year | All |
| GET | `.../faculty-assignments/class/{classId}?academicYear=` | Class assignments | All |
| GET | `.../faculty-assignments/faculty/{facultyId}` | Faculty's all assignments | All |
| GET | `.../faculty-assignments/faculty/{facultyId}/active` | Faculty's active assignments | All |

---

## Part 3: Faculty Performance Metrics

### How Performance is Calculated

```
FacultyAssignment (facultyId + classId + subjectName + academicYear)
        ↓
ExamSubject (where examinationId.academicYear matches, classId matches, subjectName matches)
        ↓
ExamResult (student scores for those exam subjects)
        ↓
Aggregation: averages, pass %, grade distribution
```

### API Endpoints — Faculty Performance

Base: `/api/v1/organizations/{organizationId}/faculty/{facultyId}/performance`

#### Overall Performance

**GET** `/?academicYear={year}`

- `academicYear` — **optional** (if omitted, uses current year or all)

**Response:** `FacultyPerformanceResponse`
```
{
  facultyId, facultyName, employeeId, academicYear,
  summary: {
    totalClassesAssigned, totalSubjectsTaught, totalStudentsTaught,
    overallAverageMarks, overallPassPercentage,
    overallGradeDistribution: { "A+": 8, "A": 20, ... }
  },
  subjectWise: [{
    subjectName, classesCount,
    classes: [{ classId, className, studentsCount, averageMarks, passPercentage, gradeDistribution }],
    totalStudents, averageMarks, passPercentage
  }],
  classTeacherOf: { classId, className, studentsCount, classOverallAverage, classPassPercentage }
}
```

---

#### Performance in a Specific Class

**GET** `/class/{classId}?academicYear={year}`

- `academicYear` — **required**

**Response:** `FacultyClassPerformanceResponse`
```
{
  facultyId, facultyName, classId, className, academicYear,
  subjectName, assignmentType, studentsCount,
  averageMarks, highestMarks, lowestMarks, passPercentage,
  gradeDistribution: { "A+": 5, ... },
  examWise: [{
    examinationId, examinationName, examType,
    averageMarks, passPercentage, studentsAppeared, studentsAbsent
  }]
}
```

---

#### Performance Across Classes for a Subject

**GET** `/subject/{subjectName}?academicYear={year}`

- `academicYear` — **optional**

**Response:** `FacultySubjectPerformanceResponse`
```
{
  facultyId, facultyName, subjectName, academicYear,
  totalClasses, totalStudents, overallAverage, overallPassPercentage,
  classBreakdown: [{ classId, className, studentsCount, averageMarks, passPercentage }]
}
```

---

#### Endpoint Summary — Faculty Performance

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/faculty/{facultyId}/performance?academicYear=` | Overall metrics | OA, ADMIN |
| GET | `/faculty/{facultyId}/performance/class/{classId}?academicYear=` | Per-class metrics | OA, ADMIN |
| GET | `/faculty/{facultyId}/performance/subject/{subjectName}?academicYear=` | Per-subject metrics | OA, ADMIN |

---

## Part 4: Class Progression

### Data Model

**ClassProgressionRequest:**
```
{ sequence: [{ className: string, displayOrder: number, isTerminal: boolean }] }
```

**ClassProgressionResponse:**
```
{ id, organizationId, branchId, sequence: [{ className, displayOrder, isTerminal }], createdAt, updatedAt }
```

### API Endpoints

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| PUT | `/branches/{branchId}/class-progression` | Set class progression | OA |
| GET | `/branches/{branchId}/class-progression` | Get class progression | OA, ADMIN |

---

## Part 5: Promotions

### Preview

**GET** `/branches/{branchId}/promotions/preview?sourceClassId={id}&targetAcademicYear={year}`

**Response:** `PromotionPreviewResponse`
```
{
  sourceClass: { id, name, section, academicYear, branchId, status },
  targetClassName, targetAcademicYear, terminalClass,
  totalEligible, totalRecommendedPromote, totalRecommendedHoldBack,
  totalRecommendedGraduate, totalNoExamData,
  candidates: [{
    studentId, studentArkId, firstName, lastName, rollNumber,
    recommendation, hasFailingResults, failedSubjects: [],
    examSummary, hasExamData
  }]
}
```

### Execute

**POST** `/branches/{branchId}/promotions/execute`

| Field | Type | Required | Description |
|---|---|---|---|
| `sourceClassId` | string | Yes | Class to promote FROM |
| `targetAcademicYear` | string | Yes | Target year (e.g., "2026-2027") |
| `targetSection` | string | No | Override target section |
| `studentOverrides` | array | No | Per-student action overrides |

**StudentOverride:** `{ studentId, action, reason }`

**Response:** `PromotionExecuteResponse`
```
{
  sourceClassId, sourceClassName, targetClassId, targetClassName,
  sourceAcademicYear, targetAcademicYear,
  summary: { totalProcessed, promoted, graduated, heldBack },
  records: [{ studentId, studentArkId, studentName, promotionType, reason, targetClassId }]
}
```

---

## Part 6: How Exam Results Connect

When creating an exam result, the system resolves the student's classId from their **active enrollment** instead of `Student.classId`.

**Flow:**
1. Frontend sends `POST /examinations/{examId}/subjects/{subjectId}/results` with `{ studentId, marksObtained }`
2. Backend looks up `StudentEnrollment where studentId = X and status = ACTIVE`
3. Uses the enrollment's `classId` to populate `ExamResult.classId`
4. Validates that the enrollment's classId matches the ExamSubject's classId

---

## Complete Entity Relationship Diagram

```
Organization
    └──→ Branch
            ├──→ AcademicClass (name, section, academicYear)
            │        │
            │        ├──→ StudentEnrollment ──→ Student (personal info)
            │        │       • enrolledAt, exitedAt, exitReason
            │        │       • status: ACTIVE / COMPLETED
            │        │
            │        ├──→ FacultyAssignment ──→ Faculty (personal info)
            │        │       • subjectName, assignmentType
            │        │       • status: ACTIVE / COMPLETED
            │        │
            │        └──→ ExamSubject ──→ Examination
            │                 │
            │                 └──→ ExamResult ──→ Student
            │
            ├──→ ClassProgression (class ordering config)
            │
            └──→ Examination (scoped to branch + year)
```

---

## Complete Enums Reference

| Entity | Field | Values | Notes |
|---|---|---|---|
| Student | `status` | `ACTIVE`, `INACTIVE`, `GRADUATED`, `TRANSFERRED`, `DROPPED` | |
| StudentEnrollment | `status` | `ACTIVE`, `COMPLETED` | ACTIVE = currently enrolled |
| StudentEnrollment | `exitReason` | `PROMOTED`, `GRADUATED`, `HELD_BACK`, `TRANSFERRED`, `DROPPED` | null if still active |
| Faculty | `status` | `ACTIVE`, `INACTIVE`, `ON_LEAVE`, `RESIGNED`, `TERMINATED` | |
| FacultyAssignment | `assignmentType` | `SUBJECT_TEACHER`, `CLASS_TEACHER`, `BOTH` | Required on create |
| FacultyAssignment | `status` | `ACTIVE`, `COMPLETED` | |
| AcademicClass | `status` | `ACTIVE`, `INACTIVE`, `COMPLETED` | COMPLETED = year ended |

---

## All New Endpoints Summary

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| **Student Enrollment** | | | |
| POST | `.../branches/{branchId}/enrollments` | Enroll student | SA, OA, ADMIN |
| PUT | `.../branches/{branchId}/enrollments/{enrollmentId}/close` | Close enrollment | SA, OA, ADMIN |
| GET | `.../branches/{branchId}/enrollments?academicYear=` | Branch enrollments | All |
| GET | `.../branches/{branchId}/enrollments/class/{classId}` | Class enrollments | All |
| GET | `.../branches/{branchId}/enrollments/student/{studentId}/active` | Active enrollment | All |
| GET | `.../branches/{branchId}/enrollments/student/{studentId}/history` | Enrollment history | All |
| **Faculty Assignment** | | | |
| POST | `.../faculty-assignments/` | Create assignment | OA, ADMIN |
| PUT | `.../faculty-assignments/{assignmentId}` | Update assignment | OA, ADMIN |
| DELETE | `.../faculty-assignments/{assignmentId}` | Delete assignment | OA, ADMIN |
| GET | `.../faculty-assignments/{assignmentId}` | Get by ID | All |
| GET | `.../faculty-assignments/?academicYear=` | Branch assignments | All |
| GET | `.../faculty-assignments/class/{classId}?academicYear=` | Class assignments | All |
| GET | `.../faculty-assignments/faculty/{facultyId}` | Faculty assignments | All |
| GET | `.../faculty-assignments/faculty/{facultyId}/active` | Active assignments | All |
| **Faculty Performance** | | | |
| GET | `/faculty/{facultyId}/performance?academicYear=` | Overall metrics | OA, ADMIN |
| GET | `/faculty/{facultyId}/performance/class/{classId}?academicYear=` | Per-class metrics | OA, ADMIN |
| GET | `/faculty/{facultyId}/performance/subject/{subjectName}?academicYear=` | Per-subject metrics | OA, ADMIN |
| **Class Progression** | | | |
| PUT | `.../branches/{branchId}/class-progression` | Set class order | OA |
| GET | `.../branches/{branchId}/class-progression` | Get class order | OA, ADMIN |
| **Promotion** | | | |
| GET | `.../branches/{branchId}/promotions/preview?sourceClassId=&targetAcademicYear=` | Preview | OA, ADMIN |
| POST | `.../branches/{branchId}/promotions/execute` | Execute | OA, ADMIN |

---

## Important Notes for Frontend

1. **`Student.classId` still exists on the response** but enrollment is the source of truth for class assignment.
2. **Enrollment endpoints are all under `/branches/{branchId}/enrollments`** — not under `/students/{studentId}`.
3. **FacultyAssignment status is only ACTIVE or COMPLETED** — no RELIEVED status (use DELETE or set COMPLETED).
4. **FacultyAssignment response does not include denormalized names** (no `facultyName`, `className`). Frontend must resolve these from separate API calls.
5. **StudentEnrollment response does not include denormalized names** (no `studentName`, `className`). Frontend must resolve these from separate API calls.
6. **Faculty assignments are per academic year.** At the start of each year, admin creates new assignments.
7. **Performance metrics require both FacultyAssignment and exam data.** If no exams conducted, performance returns zeroes.
8. **`subjectName` in FacultyAssignment must match `subjectName` in ExamSubject** for performance linking.
9. **One active enrollment per student at a time.** Creating a new enrollment while one is active returns `409`.
10. **Promotion closes enrollments automatically.** Don't manually close enrollments before triggering promotion.
11. **Academic year format:** `"2025-2026"` (start year - end year, hyphen separated).
