import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth.ts'
import Layout from './components/layout/Layout.tsx'
import ProtectedRoute from './components/ProtectedRoute.tsx'
import RoleGuard from './components/RoleGuard.tsx'
import { ROLE_PERMISSIONS } from './config/roles.ts'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import type { UserRole } from './types/auth.ts'

const Login = lazy(() => import('./pages/Login.tsx'))
const Dashboard = lazy(() => import('./pages/Dashboard.tsx'))
const Organizations = lazy(() => import('./pages/Organizations.tsx'))
const Branches = lazy(() => import('./pages/Branches.tsx'))
const Classes = lazy(() => import('./pages/Classes.tsx'))
const Students = lazy(() => import('./pages/Students.tsx'))
const OrgStudents = lazy(() => import('./pages/OrgStudents.tsx'))
const Faculty = lazy(() => import('./pages/Faculty.tsx'))
const Users = lazy(() => import('./pages/Users.tsx'))
const Examinations = lazy(() => import('./pages/Examinations.tsx'))
const ExamSubjects = lazy(() => import('./pages/ExamSubjects.tsx'))
const ExamResults = lazy(() => import('./pages/ExamResults.tsx'))
const ExamClassResults = lazy(() => import('./pages/ExamClassResults.tsx'))
const StudentReportCard = lazy(() => import('./pages/StudentReportCard.tsx'))
const StudentExams = lazy(() => import('./pages/StudentExams.tsx'))
const ClassExams = lazy(() => import('./pages/ClassExams.tsx'))
const StudentEnrollmentHistory = lazy(() => import('./pages/StudentEnrollmentHistory.tsx'))
const ClassEnrollments = lazy(() => import('./pages/ClassEnrollments.tsx'))
const FacultyAssignments = lazy(() => import('./pages/FacultyAssignments.tsx'))
const ClassFacultyAssignments = lazy(() => import('./pages/ClassFacultyAssignments.tsx'))
const FacultyPerformance = lazy(() => import('./pages/FacultyPerformance.tsx'))
const ClassProgression = lazy(() => import('./pages/ClassProgression.tsx'))
const Promotions = lazy(() => import('./pages/Promotions.tsx'))
const EnterMarks = lazy(() => import('./pages/EnterMarks.tsx'))
const AcademicRecords = lazy(() => import('./pages/AcademicRecords.tsx'))
const Reports = lazy(() => import('./pages/Reports.tsx'))
const AuditLogs = lazy(() => import('./pages/AuditLogs.tsx'))
const NotFound = lazy(() => import('./pages/NotFound.tsx'))

const Fallback = <div className="text-center py-5"><div className="spinner-border text-primary" /></div>

/** Wraps a lazy page with per-route ErrorBoundary + Suspense */
function Page({ children, roles }: { children: ReactNode; roles?: UserRole[] }) {
  const content = (
    <ErrorBoundary>
      <Suspense fallback={Fallback}>{children}</Suspense>
    </ErrorBoundary>
  )
  if (roles) return <RoleGuard roles={roles}>{content}</RoleGuard>
  return content
}

function AppRoutes() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route
        path="login"
        element={
          isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <Suspense fallback={Fallback}><Login /></Suspense>
          )
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Page><Dashboard /></Page>} />
        <Route path="organizations" element={<Page roles={ROLE_PERMISSIONS.organizations}><Organizations /></Page>} />
        <Route path="organizations/:organizationId/branches" element={<Page roles={ROLE_PERMISSIONS.branches}><Branches /></Page>} />
        <Route path="organizations/:organizationId/branches/:branchId/classes" element={<Page roles={ROLE_PERMISSIONS.classes}><Classes /></Page>} />
        <Route path="organizations/:organizationId/students" element={<Page roles={ROLE_PERMISSIONS.students}><OrgStudents /></Page>} />
        <Route path="organizations/:organizationId/branches/:branchId/students" element={<Page roles={ROLE_PERMISSIONS.students}><Students /></Page>} />
        <Route path="organizations/:organizationId/faculty" element={<Page roles={ROLE_PERMISSIONS.faculty}><Faculty /></Page>} />
        <Route path="organizations/:organizationId/users" element={<Page roles={ROLE_PERMISSIONS.users}><Users /></Page>} />
        <Route path="organizations/:organizationId/branches/:branchId/examinations" element={<Page roles={ROLE_PERMISSIONS.examinations}><Examinations /></Page>} />
        <Route path="organizations/:organizationId/examinations/:examId/subjects" element={<Page roles={ROLE_PERMISSIONS.examinations}><ExamSubjects /></Page>} />
        <Route path="organizations/:organizationId/examinations/:examId/subjects/:subjectId/results" element={<Page roles={ROLE_PERMISSIONS.examinations}><ExamResults /></Page>} />
        <Route path="organizations/:organizationId/examinations/:examId/classes/:classId/results" element={<Page roles={ROLE_PERMISSIONS.examinations}><ExamClassResults /></Page>} />
        <Route path="organizations/:organizationId/examinations/:examId/students/:studentId/results" element={<Page roles={ROLE_PERMISSIONS.examinations}><StudentReportCard /></Page>} />
        <Route path="organizations/:organizationId/branches/:branchId/students/:studentId/enrollments" element={<Page roles={ROLE_PERMISSIONS.enrollments}><StudentEnrollmentHistory /></Page>} />
        <Route path="organizations/:organizationId/branches/:branchId/classes/:classId/enrollments" element={<Page roles={ROLE_PERMISSIONS.enrollments}><ClassEnrollments /></Page>} />
        <Route path="organizations/:organizationId/branches/:branchId/faculty/:facultyId/assignments" element={<Page roles={ROLE_PERMISSIONS.facultyAssignments}><FacultyAssignments /></Page>} />
        <Route path="organizations/:organizationId/branches/:branchId/classes/:classId/faculty" element={<Page roles={ROLE_PERMISSIONS.facultyAssignments}><ClassFacultyAssignments /></Page>} />
        <Route path="organizations/:organizationId/faculty/:facultyId/performance" element={<Page roles={ROLE_PERMISSIONS.facultyPerformance}><FacultyPerformance /></Page>} />
        <Route path="organizations/:organizationId/branches/:branchId/class-progression" element={<Page roles={ROLE_PERMISSIONS.classProgression}><ClassProgression /></Page>} />
        <Route path="organizations/:organizationId/branches/:branchId/classes/:classId/promotions" element={<Page roles={ROLE_PERMISSIONS.promotions}><Promotions /></Page>} />
        <Route path="organizations/:organizationId/branches/:branchId/students/:studentId/report-card" element={<Page roles={ROLE_PERMISSIONS.students}><StudentExams /></Page>} />
        <Route path="organizations/:organizationId/branches/:branchId/classes/:classId/results" element={<Page roles={ROLE_PERMISSIONS.classes}><ClassExams /></Page>} />
        <Route path="organizations/:organizationId/branches/:branchId/classes/:classId/enter-marks" element={<Page roles={ROLE_PERMISSIONS.examinations}><EnterMarks /></Page>} />
        <Route path="academic-records" element={<Page><AcademicRecords /></Page>} />
        <Route path="reports" element={<Page><Reports /></Page>} />
        <Route path="audit-logs" element={<Page roles={ROLE_PERMISSIONS.auditLogs}><AuditLogs /></Page>} />
        <Route path="*" element={<Page><NotFound /></Page>} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
