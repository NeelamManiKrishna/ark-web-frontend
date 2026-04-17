import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getExaminations } from '../api/examinationApi.ts'
import { getStudentById } from '../api/studentApi.ts'
import { getOrganizationById } from '../api/organizationApi.ts'
import type { ExaminationResponse } from '../types/examination.ts'
import { useToast } from '../hooks/useToast.ts'
import StatusBadge from '../components/StatusBadge.tsx'
import Pagination from '../components/Pagination.tsx'
import Toast from '../components/Toast.tsx'

function StudentExams() {
  const { organizationId, branchId, studentId } = useParams<{
    organizationId: string
    branchId: string
    studentId: string
  }>()
  const navigate = useNavigate()
  const { toast, dismiss } = useToast()

  const [studentName, setStudentName] = useState('')
  const [studentArkId, setStudentArkId] = useState('')
  const [orgName, setOrgName] = useState('')
  const [exams, setExams] = useState<ExaminationResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Fetch org name
  useEffect(() => {
    if (!organizationId) return
    getOrganizationById(organizationId)
      .then((org) => setOrgName(org.name))
      .catch(() => setOrgName(''))
  }, [organizationId])

  // Fetch student details
  useEffect(() => {
    if (!organizationId || !studentId) return
    getStudentById(organizationId, studentId)
      .then((student) => {
        setStudentName(`${student.firstName} ${student.lastName}`)
        setStudentArkId(student.arkId)
      })
      .catch(() => {
        setStudentName('Unknown Student')
        setError('Failed to load student details')
      })
  }, [organizationId, studentId])

  const fetchExams = useCallback(async () => {
    if (!organizationId || !branchId) return
    setLoading(true)
    setError('')
    try {
      const data = await getExaminations(organizationId, branchId, page, 10)
      setExams(data.content)
      setTotalPages(data.page.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load examinations')
    } finally {
      setLoading(false)
    }
  }, [organizationId, branchId, page])

  useEffect(() => {
    fetchExams()
  }, [fetchExams])

  const formatExamType = (type: string) =>
    type
      .split('_')
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ')

  return (
    <div className="page-container">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={dismiss} />
      )}

      <div className="mb-3">
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => navigate(`/organizations/${organizationId}/branches/${branchId}/students`)}
        >
          &larr; Back to Students
        </button>
      </div>

      <div className="mb-4">
        <h1 className="page-title">Report Card</h1>
        <p className="text-muted mb-0">
          {studentName}{studentArkId ? ` (${studentArkId})` : ''}
          {orgName ? ` — ${orgName}` : ''}
        </p>
        <p className="text-muted mb-0">Select an examination to view results</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : exams.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <p>No examinations found for this branch.</p>
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-hover align-middle app-table">
              <thead>
                <tr>
                  <th>ARK ID</th>
                  <th>Name</th>
                  <th>Academic Year</th>
                  <th>Type</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam) => (
                  <tr key={exam.id}>
                    <td><code>{exam.arkId}</code></td>
                    <td className="fw-semibold">{exam.name}</td>
                    <td>{exam.academicYear}</td>
                    <td>{formatExamType(exam.examType)}</td>
                    <td>{exam.startDate}</td>
                    <td>{exam.endDate}</td>
                    <td><StatusBadge status={exam.status} /></td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() =>
                          navigate(
                            `/organizations/${organizationId}/examinations/${exam.id}/students/${studentId}/results`,
                          )
                        }
                      >
                        View Results
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}

export default StudentExams
