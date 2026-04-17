import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getStudents } from '../api/studentApi.ts'
import { getBranches } from '../api/branchApi.ts'
import { getAcademicClasses } from '../api/academicClassApi.ts'
import { getOrganizationById } from '../api/organizationApi.ts'
import { useAuth } from '../hooks/useAuth.ts'
import { useToast } from '../hooks/useToast.ts'
import type { StudentResponse } from '../types/student.ts'
import type { BranchResponse } from '../types/branch.ts'
import type { AcademicClassResponse } from '../types/academicClass.ts'
import StatusBadge from '../components/StatusBadge.tsx'
import Pagination from '../components/Pagination.tsx'
import Toast from '../components/Toast.tsx'
import LoadingSpinner from '../components/LoadingSpinner.tsx'
import EmptyState from '../components/EmptyState.tsx'

function OrgStudents() {
  const { organizationId } = useParams<{ organizationId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const { toast, dismiss } = useToast()

  const [orgName, setOrgName] = useState('')
  const [students, setStudents] = useState<StudentResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Filter state
  const [filterBranchId, setFilterBranchId] = useState('')
  const [filterClassId, setFilterClassId] = useState('')
  const [filterBranches, setFilterBranches] = useState<BranchResponse[]>([])
  const [filterClasses, setFilterClasses] = useState<AcademicClassResponse[]>([])

  // Name lookup maps
  const branchNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const b of filterBranches) map.set(b.id, b.name)
    return map
  }, [filterBranches])

  const [classNameMap, setClassNameMap] = useState<Map<string, string>>(new Map())

  // Fetch org name
  useEffect(() => {
    if (!organizationId) return
    getOrganizationById(organizationId)
      .then((org) => setOrgName(org.name))
      .catch(() => setOrgName('Unknown Organization'))
  }, [organizationId])

  // Fetch branches for filter
  useEffect(() => {
    if (!organizationId) return
    getBranches(organizationId, 0, 100)
      .then((data) => setFilterBranches(data.content))
      .catch(() => setFilterBranches([]))
  }, [organizationId])

  // Fetch classes when filter branch changes
  useEffect(() => {
    if (!organizationId || !filterBranchId) {
      setFilterClasses([])
      return
    }
    getAcademicClasses(organizationId, filterBranchId, 0, 100)
      .then((data) => {
        setFilterClasses(data.content)
        setClassNameMap((prev) => {
          const next = new Map(prev)
          for (const c of data.content) next.set(c.id, `${c.name} - ${c.section}`)
          return next
        })
      })
      .catch(() => setFilterClasses([]))
  }, [organizationId, filterBranchId])

  const fetchStudents = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)
    setError('')
    try {
      const data = await getStudents(
        organizationId,
        page,
        10,
        filterBranchId || undefined,
        filterClassId || undefined,
      )
      setStudents(data.content)
      setTotalPages(data.page.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }, [organizationId, page, filterBranchId, filterClassId])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  // Resolve class names for branches not yet fetched
  useEffect(() => {
    if (!organizationId || students.length === 0) return
    const missingBranches = new Set<string>()
    for (const s of students) {
      if (!classNameMap.has(s.classId)) missingBranches.add(s.branchId)
    }
    if (missingBranches.size === 0) return
    for (const bid of missingBranches) {
      getAcademicClasses(organizationId, bid, 0, 100)
        .then((data) => {
          setClassNameMap((prev) => {
            const next = new Map(prev)
            for (const c of data.content) next.set(c.id, `${c.name} - ${c.section}`)
            return next
          })
        })
        .catch(() => {})
    }
    // classNameMap omitted intentionally — this effect writes to it, including it would cause an infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, students])

  const handleFilterBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterBranchId(e.target.value)
    setFilterClassId('')
    setPage(0)
  }

  const handleFilterClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterClassId(e.target.value)
    setPage(0)
  }

  return (
    <div className="page-container">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={dismiss} />
      )}

      <div className="mb-3">
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => navigate(isSuperAdmin ? '/organizations' : '/')}
        >
          &larr; {isSuperAdmin ? 'Back to Organizations' : 'Back to Dashboard'}
        </button>
      </div>

      <div className="mb-4">
        <h1 className="page-title">All Students</h1>
        {orgName && <p className="text-muted mb-0">{orgName}</p>}
      </div>

      {/* Filter Bar */}
      <div className="row mb-3">
        <div className="col-md-3">
          <select
            className="form-select"
            value={filterBranchId}
            onChange={handleFilterBranchChange}
          >
            <option value="">All Branches</option>
            {filterBranches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div className="col-md-3">
          <select
            className="form-select"
            value={filterClassId}
            onChange={handleFilterClassChange}
            disabled={!filterBranchId}
          >
            <option value="">All Classes</option>
            {filterClasses.map((c) => (
              <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <LoadingSpinner />
      ) : students.length === 0 ? (
        <EmptyState message="No students found." />
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-hover align-middle app-table">
              <thead>
                <tr>
                  <th>ARK ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Branch</th>
                  <th>Class</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td><code>{student.arkId}</code></td>
                    <td className="fw-semibold">{student.firstName} {student.lastName}</td>
                    <td>{student.email}</td>
                    <td>{student.phone}</td>
                    <td>{branchNameMap.get(student.branchId) ?? student.branchId}</td>
                    <td>{classNameMap.get(student.classId) ?? student.classId}</td>
                    <td><StatusBadge status={student.status} /></td>
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

export default OrgStudents
