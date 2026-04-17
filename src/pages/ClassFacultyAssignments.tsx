import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAssignmentsByClass } from '../api/facultyAssignmentApi.ts'
import { getAcademicClassById } from '../api/academicClassApi.ts'
import { getFaculty } from '../api/facultyApi.ts'
import { useToast } from '../hooks/useToast.ts'
import type { FacultyAssignmentResponse } from '../types/facultyAssignment.ts'
import StatusBadge from '../components/StatusBadge.tsx'
import Pagination from '../components/Pagination.tsx'
import Toast from '../components/Toast.tsx'
import LoadingSpinner from '../components/LoadingSpinner.tsx'
import EmptyState from '../components/EmptyState.tsx'

function ClassFacultyAssignments() {
  const { organizationId, branchId, classId } = useParams<{
    organizationId: string
    branchId: string
    classId: string
  }>()
  const navigate = useNavigate()
  const { toast, dismiss } = useToast()

  const [className, setClassName] = useState('')
  const [academicYear, setAcademicYear] = useState('')
  const [assignments, setAssignments] = useState<FacultyAssignmentResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Faculty name lookup
  const [facultyNameMap, setFacultyNameMap] = useState<Map<string, string>>(new Map())

  // Fetch class details for name + academic year
  useEffect(() => {
    if (!organizationId || !branchId || !classId) return
    getAcademicClassById(organizationId, branchId, classId)
      .then((cls) => {
        setClassName(`${cls.name} - ${cls.section}`)
        setAcademicYear(cls.academicYear)
      })
      .catch(() => setClassName('Unknown Class'))
  }, [organizationId, branchId, classId])

  const fetchAssignments = useCallback(async () => {
    if (!organizationId || !branchId || !classId || !academicYear) return
    setLoading(true)
    setError('')
    try {
      const data = await getAssignmentsByClass(organizationId, branchId, classId, academicYear, page, 10)
      setAssignments(data.content)
      setTotalPages(data.page.totalPages)

      // Build faculty name map
      const facultyIds = [...new Set(data.content.map((a) => a.facultyId))]
      if (facultyIds.length > 0) {
        const facultyData = await getFaculty(organizationId, 0, 100, branchId)
        const map = new Map<string, string>()
        for (const f of facultyData.content) {
          map.set(f.id, `${f.firstName} ${f.lastName}`)
        }
        setFacultyNameMap(map)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load faculty assignments')
    } finally {
      setLoading(false)
    }
  }, [organizationId, branchId, classId, academicYear, page])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

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
          <h1 className="page-title">Class Faculty</h1>
          {className && <p className="text-muted mb-0">{className}</p>}
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <LoadingSpinner />
      ) : assignments.length === 0 ? (
        <EmptyState message="No faculty assigned to this class." />
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-hover align-middle app-table">
              <thead>
                <tr>
                  <th>Faculty</th>
                  <th>Subject</th>
                  <th>Academic Year</th>
                  <th>Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id}>
                    <td className="fw-semibold">
                      {facultyNameMap.get(a.facultyId) ?? a.facultyId}
                    </td>
                    <td>{a.subjectName ?? '—'}</td>
                    <td>{a.academicYear}</td>
                    <td><StatusBadge status={a.assignmentType} /></td>
                    <td><StatusBadge status={a.status} /></td>
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

export default ClassFacultyAssignments
