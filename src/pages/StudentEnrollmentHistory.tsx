import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getEnrollmentHistory, createEnrollment, closeEnrollment, getActiveEnrollment } from '../api/enrollmentApi.ts'
import { getAcademicClasses } from '../api/academicClassApi.ts'
import { getStudentById } from '../api/studentApi.ts'
import { useToast } from '../hooks/useToast.ts'
import { useCanWrite } from '../hooks/useCanWrite.ts'
import { WRITE_ROLES } from '../config/roles.ts'
import type { StudentEnrollmentResponse, ExitReason } from '../types/enrollment.ts'
import type { AcademicClassResponse } from '../types/academicClass.ts'
import StatusBadge from '../components/StatusBadge.tsx'
import Toast from '../components/Toast.tsx'
import Modal from '../components/Modal.tsx'
import { EXIT_REASON_OPTIONS } from '../constants/statuses.ts'
import LoadingSpinner from '../components/LoadingSpinner.tsx'
import EmptyState from '../components/EmptyState.tsx'

function StudentEnrollmentHistory() {
  const { organizationId, branchId, studentId } = useParams<{
    organizationId: string
    branchId: string
    studentId: string
  }>()
  const navigate = useNavigate()
  const canWrite = useCanWrite(WRITE_ROLES.enrollments)
  const { toast, showSuccess, showError, dismiss } = useToast()

  const [studentName, setStudentName] = useState('')
  const [enrollments, setEnrollments] = useState<StudentEnrollmentResponse[]>([])
  const [activeEnrollment, setActiveEnrollment] = useState<StudentEnrollmentResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Class name lookup
  const [classNameMap, setClassNameMap] = useState<Map<string, string>>(new Map())
  const [classes, setClasses] = useState<AcademicClassResponse[]>([])

  // Enroll modal
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [enrollClassId, setEnrollClassId] = useState('')
  const [enrollAcademicYear, setEnrollAcademicYear] = useState('')
  const [enrollDate, setEnrollDate] = useState('')
  const [enrollSubmitting, setEnrollSubmitting] = useState(false)
  const [enrollErrors, setEnrollErrors] = useState<Record<string, string>>({})

  // Close enrollment modal
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [closeTarget, setCloseTarget] = useState<StudentEnrollmentResponse | null>(null)
  const [closeExitReason, setCloseExitReason] = useState<ExitReason>('PROMOTED')
  const [closeExitDate, setCloseExitDate] = useState('')
  const [closeSubmitting, setCloseSubmitting] = useState(false)

  // Fetch student name
  useEffect(() => {
    if (!organizationId || !studentId) return
    getStudentById(organizationId, studentId)
      .then((s) => setStudentName(`${s.firstName} ${s.lastName}`))
      .catch(() => setStudentName('Unknown Student'))
  }, [organizationId, studentId])

  // Fetch classes for name lookup + enroll form
  useEffect(() => {
    if (!organizationId || !branchId) return
    getAcademicClasses(organizationId, branchId, 0, 100)
      .then((data) => {
        setClasses(data.content)
        const map = new Map<string, string>()
        for (const c of data.content) map.set(c.id, `${c.name} - ${c.section}`)
        setClassNameMap(map)
      })
      .catch(() => setClasses([]))
  }, [organizationId, branchId])

  const fetchHistory = useCallback(async () => {
    if (!organizationId || !branchId || !studentId) return
    setLoading(true)
    setError('')
    try {
      const [history, active] = await Promise.allSettled([
        getEnrollmentHistory(organizationId, branchId, studentId),
        getActiveEnrollment(organizationId, branchId, studentId),
      ])
      setEnrollments(history.status === 'fulfilled' ? history.value : [])
      setActiveEnrollment(active.status === 'fulfilled' ? active.value : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load enrollment history')
    } finally {
      setLoading(false)
    }
  }, [organizationId, branchId, studentId])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  // Enroll modal handlers
  const openEnrollModal = () => {
    setEnrollClassId('')
    setEnrollAcademicYear('')
    setEnrollDate('')
    setEnrollErrors({})
    setShowEnrollModal(true)
  }

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organizationId || !branchId || !studentId) return
    const errors: Record<string, string> = {}
    if (!enrollClassId) errors.classId = 'Class is required'
    if (!enrollAcademicYear.trim()) errors.academicYear = 'Academic year is required'
    else if (!/^\d{4}-\d{4}$/.test(enrollAcademicYear.trim())) errors.academicYear = 'Enter a valid academic year (e.g. 2025-2026)'
    setEnrollErrors(errors)
    if (Object.keys(errors).length > 0) return
    setEnrollSubmitting(true)
    try {
      await createEnrollment(organizationId, branchId, {
        studentId,
        classId: enrollClassId,
        academicYear: enrollAcademicYear,
        enrolledAt: enrollDate || undefined,
      })
      showSuccess('Student enrolled successfully')
      setShowEnrollModal(false)
      fetchHistory()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to enroll student')
    } finally {
      setEnrollSubmitting(false)
    }
  }

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
      fetchHistory()
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
          onClick={() => navigate(`/organizations/${organizationId}/branches/${branchId}/students`)}
        >
          &larr; Back to Students
        </button>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title">Enrollment History</h1>
          {studentName && <p className="text-muted mb-0">{studentName}</p>}
        </div>
        {canWrite && !activeEnrollment && (
          <button className="btn btn-primary" onClick={openEnrollModal}>
            + Enroll Student
          </button>
        )}
      </div>

      {/* Active enrollment banner */}
      {activeEnrollment && (
        <div className="alert alert-info d-flex justify-content-between align-items-center">
          <div>
            <strong>Active Enrollment:</strong>{' '}
            {classNameMap.get(activeEnrollment.classId) ?? activeEnrollment.classId}
            {' — '}{activeEnrollment.academicYear}
            {' (enrolled '}{new Date(activeEnrollment.enrolledAt).toLocaleDateString()}{')'}
          </div>
          {canWrite && (
            <button
              className="btn btn-sm btn-outline-warning"
              onClick={() => openCloseModal(activeEnrollment)}
            >
              Close Enrollment
            </button>
          )}
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <LoadingSpinner />
      ) : enrollments.length === 0 ? (
        <EmptyState message="No enrollment records found for this student." />
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle app-table">
            <thead>
              <tr>
                <th>Class</th>
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
                    {classNameMap.get(enrollment.classId) ?? enrollment.classId}
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
      )}

      {/* Enroll Modal */}
      <Modal
        isOpen={showEnrollModal}
        onClose={() => setShowEnrollModal(false)}
        title="Enroll Student"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setShowEnrollModal(false)}>
              Cancel
            </button>
            <button type="submit" form="enroll-form" className="btn btn-primary" disabled={enrollSubmitting}>
              {enrollSubmitting ? 'Enrolling...' : 'Enroll'}
            </button>
          </>
        }
      >
        <form id="enroll-form" onSubmit={handleEnroll} noValidate>
          <div className="mb-3">
            <label htmlFor="enrollClassId" className="form-label">Class <span className="text-danger">*</span></label>
            <select
              id="enrollClassId"
              className={`form-select${enrollErrors.classId ? ' is-invalid' : ''}`}
              value={enrollClassId}
              onChange={(e) => { setEnrollClassId(e.target.value); setEnrollErrors((prev) => { const n = { ...prev }; delete n.classId; return n }) }}
            >
              <option value="">Select Class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name} - {c.section} ({c.academicYear})</option>
              ))}
            </select>
            {enrollErrors.classId && <div className="invalid-feedback">{enrollErrors.classId}</div>}
          </div>
          <div className="mb-3">
            <label htmlFor="enrollAcademicYear" className="form-label">Academic Year <span className="text-danger">*</span></label>
            <input
              id="enrollAcademicYear"
              className={`form-control${enrollErrors.academicYear ? ' is-invalid' : ''}`}
              value={enrollAcademicYear}
              onChange={(e) => { setEnrollAcademicYear(e.target.value); setEnrollErrors((prev) => { const n = { ...prev }; delete n.academicYear; return n }) }}
              placeholder="e.g. 2025-2026"
            />
            {enrollErrors.academicYear && <div className="invalid-feedback">{enrollErrors.academicYear}</div>}
          </div>
          <div className="mb-3">
            <label htmlFor="enrollDate" className="form-label">Enrollment Date</label>
            <input
              id="enrollDate"
              className="form-control"
              type="date"
              value={enrollDate}
              onChange={(e) => setEnrollDate(e.target.value)}
            />
          </div>
        </form>
      </Modal>

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
              Closing enrollment for <strong>{classNameMap.get(closeTarget.classId) ?? closeTarget.classId}</strong>
              {' — '}{closeTarget.academicYear}
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

export default StudentEnrollmentHistory
