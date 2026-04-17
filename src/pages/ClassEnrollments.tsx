import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getEnrollmentsByClass, closeEnrollment } from '../api/enrollmentApi.ts'
import { getAcademicClassById } from '../api/academicClassApi.ts'
import { getStudents } from '../api/studentApi.ts'
import { useToast } from '../hooks/useToast.ts'
import { useCanWrite } from '../hooks/useCanWrite.ts'
import { WRITE_ROLES } from '../config/roles.ts'
import type { StudentEnrollmentResponse, ExitReason } from '../types/enrollment.ts'

import StatusBadge from '../components/StatusBadge.tsx'
import Pagination from '../components/Pagination.tsx'
import Toast from '../components/Toast.tsx'
import Modal from '../components/Modal.tsx'
import { EXIT_REASON_OPTIONS } from '../constants/statuses.ts'
import LoadingSpinner from '../components/LoadingSpinner.tsx'
import EmptyState from '../components/EmptyState.tsx'

function ClassEnrollments() {
  const { organizationId, branchId, classId } = useParams<{
    organizationId: string
    branchId: string
    classId: string
  }>()
  const navigate = useNavigate()
  const canWrite = useCanWrite(WRITE_ROLES.enrollments)
  const { toast, showSuccess, showError, dismiss } = useToast()

  const [className, setClassName] = useState('')
  const [enrollments, setEnrollments] = useState<StudentEnrollmentResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Student name lookup
  const [studentNameMap, setStudentNameMap] = useState<Map<string, string>>(new Map())

  // Close enrollment modal
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [closeTarget, setCloseTarget] = useState<StudentEnrollmentResponse | null>(null)
  const [closeExitReason, setCloseExitReason] = useState<ExitReason>('PROMOTED')
  const [closeExitDate, setCloseExitDate] = useState('')
  const [closeSubmitting, setCloseSubmitting] = useState(false)

  // Fetch class name
  useEffect(() => {
    if (!organizationId || !branchId || !classId) return
    getAcademicClassById(organizationId, branchId, classId)
      .then((cls) => setClassName(`${cls.name} - ${cls.section}`))
      .catch(() => setClassName('Unknown Class'))
  }, [organizationId, branchId, classId])

  const fetchEnrollments = useCallback(async () => {
    if (!organizationId || !branchId || !classId) return
    setLoading(true)
    setError('')
    try {
      const data = await getEnrollmentsByClass(organizationId, branchId, classId, page, 10)
      setEnrollments(data.content)
      setTotalPages(data.page.totalPages)

      // Build student name map from student IDs in enrollments
      const studentIds = [...new Set(data.content.map((e) => e.studentId))]
      if (studentIds.length > 0) {
        // Fetch students scoped to this class for the name map
        const studentsData = await getStudents(organizationId, 0, 100, branchId, classId)
        const map = new Map<string, string>()
        for (const s of studentsData.content) {
          map.set(s.id, `${s.firstName} ${s.lastName}`)
        }
        setStudentNameMap(map)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load class enrollments')
    } finally {
      setLoading(false)
    }
  }, [organizationId, branchId, classId, page])

  useEffect(() => {
    fetchEnrollments()
  }, [fetchEnrollments])

  // Close enrollment handlers
  const openCloseModal = (enrollment: StudentEnrollmentResponse) => {
    setCloseTarget(enrollment)
    setCloseExitReason('PROMOTED')
    setCloseExitDate('')
    setShowCloseModal(true)
  }

  const handleCloseEnrollment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organizationId || !branchId || !closeTarget) return
    setCloseSubmitting(true)
    try {
      await closeEnrollment(organizationId, branchId, closeTarget.id, {
        exitReason: closeExitReason,
        exitedAt: closeExitDate || undefined,
      })
      showSuccess('Enrollment closed successfully')
      setShowCloseModal(false)
      setCloseTarget(null)
      fetchEnrollments()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to close enrollment')
    } finally {
      setCloseSubmitting(false)
    }
  }

  return (
    <div className="page-container">
      {toast && <Toast message={toast.message} type={toast.type} onClose={dismiss} />}

      <div className="mb-3">
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => navigate(`/organizations/${organizationId}/branches/${branchId}/classes`)}
        >
          &larr; Back to Classes
        </button>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title">Class Roster</h1>
          {className && <p className="text-muted mb-0">{className}</p>}
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <LoadingSpinner />
      ) : enrollments.length === 0 ? (
        <EmptyState message="No students enrolled in this class." />
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-hover align-middle app-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Academic Year</th>
                  <th>Enrolled At</th>
                  <th>Exited At</th>
                  <th>Exit Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((enrollment) => (
                  <tr key={enrollment.id}>
                    <td className="fw-semibold">
                      {studentNameMap.get(enrollment.studentId) ?? enrollment.studentId}
                    </td>
                    <td>{enrollment.academicYear}</td>
                    <td>{new Date(enrollment.enrolledAt).toLocaleDateString()}</td>
                    <td>{enrollment.exitedAt ? new Date(enrollment.exitedAt).toLocaleDateString() : '—'}</td>
                    <td>{enrollment.exitReason ? <StatusBadge status={enrollment.exitReason} /> : '—'}</td>
                    <td><StatusBadge status={enrollment.status} /></td>
                    <td>
                      {canWrite && enrollment.status === 'ACTIVE' && (
                        <button
                          className="btn btn-sm btn-outline-warning"
                          onClick={() => openCloseModal(enrollment)}
                        >
                          Close
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* Close Enrollment Modal */}
      <Modal
        isOpen={showCloseModal}
        onClose={() => { setShowCloseModal(false); setCloseTarget(null) }}
        title="Close Enrollment"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => { setShowCloseModal(false); setCloseTarget(null) }}>
              Cancel
            </button>
            <button type="submit" form="close-enrollment-form" className="btn btn-warning" disabled={closeSubmitting}>
              {closeSubmitting ? 'Closing...' : 'Close Enrollment'}
            </button>
          </>
        }
      >
        <form id="close-enrollment-form" onSubmit={handleCloseEnrollment} noValidate>
          {closeTarget && (
            <p className="text-muted mb-3">
              Closing enrollment for <strong>{studentNameMap.get(closeTarget.studentId) ?? closeTarget.studentId}</strong>
            </p>
          )}
          <div className="mb-3">
            <label htmlFor="closeExitReason" className="form-label">Exit Reason <span className="text-danger">*</span></label>
            <select
              id="closeExitReason"
              className="form-select"
              value={closeExitReason}
              onChange={(e) => setCloseExitReason(e.target.value as ExitReason)}
            >
              {EXIT_REASON_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label htmlFor="closeExitDate" className="form-label">Exit Date</label>
            <input
              id="closeExitDate"
              className="form-control"
              type="date"
              value={closeExitDate}
              onChange={(e) => setCloseExitDate(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default ClassEnrollments
