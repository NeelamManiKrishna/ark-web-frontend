import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getExaminationById,
  getClassExamResults,
  getExamSubjects,
} from '../api/examinationApi.ts'
import { getStudents } from '../api/studentApi.ts'
import { getAcademicClasses } from '../api/academicClassApi.ts'
import type { ExamResultResponse } from '../types/examination.ts'
import type { StudentResponse } from '../types/student.ts'
import { useToast } from '../hooks/useToast.ts'
import StatusBadge from '../components/StatusBadge.tsx'
import Pagination from '../components/Pagination.tsx'
import Toast from '../components/Toast.tsx'
import LoadingSpinner from '../components/LoadingSpinner.tsx'
import EmptyState from '../components/EmptyState.tsx'

function ExamClassResults() {
  const { organizationId, examId, classId } = useParams<{
    organizationId: string
    examId: string
    classId: string
  }>()
  const navigate = useNavigate()
  const { toast, showError, dismiss } = useToast()

  const [examName, setExamName] = useState('')
  const [branchId, setBranchId] = useState('')
  const [className, setClassName] = useState('')
  const [students, setStudents] = useState<StudentResponse[]>([])
  const [studentNameMap, setStudentNameMap] = useState<Map<string, string>>(new Map())
  const [subjectNameMap, setSubjectNameMap] = useState<Map<string, string>>(new Map())
  const [subjectMaxMarksMap, setSubjectMaxMarksMap] = useState<Map<string, number>>(new Map())
  const [allResults, setAllResults] = useState<ExamResultResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterStudentId, setFilterStudentId] = useState('')
  const [page, setPage] = useState(0)

  // Fetch exam details, students, subjects, and class name
  useEffect(() => {
    if (!organizationId || !examId || !classId) return

    getExaminationById(organizationId, examId)
      .then((exam) => {
        setExamName(exam.name)
        setBranchId(exam.branchId)

        // Fetch students filtered by branchId from exam
        getStudents(organizationId, 0, 1000, exam.branchId, classId)
          .then((data) => {
            setStudents(data.content)
            const nameMap = new Map<string, string>()
            for (const s of data.content) {
              nameMap.set(s.id, `${s.firstName} ${s.lastName} (${s.arkId})`)
            }
            setStudentNameMap(nameMap)
          })
          .catch(() => showError('Failed to load students'))

        // Fetch academic classes to resolve class name
        getAcademicClasses(organizationId, exam.branchId, 0, 100)
          .then((data) => {
            const found = data.content.find((c) => c.id === classId)
            if (found) {
              setClassName(found.name)
            }
          })
          .catch(() => setClassName(''))
      })
      .catch(() => {
        setExamName('Unknown Examination')
        showError('Failed to load examination details')
      })

    // Fetch exam subjects for name and max marks maps
    getExamSubjects(organizationId, examId, 0, 100)
      .then((data) => {
        const nameMap = new Map<string, string>()
        const marksMap = new Map<string, number>()
        for (const s of data.content) {
          nameMap.set(s.id, s.subjectName)
          marksMap.set(s.id, s.maxMarks)
        }
        setSubjectNameMap(nameMap)
        setSubjectMaxMarksMap(marksMap)
      })
      .catch(() => showError('Failed to load exam subjects'))
  }, [organizationId, examId, classId, showError])

  const fetchResults = useCallback(async () => {
    if (!organizationId || !examId || !classId) return
    setLoading(true)
    setError('')
    try {
      const data = await getClassExamResults(organizationId, examId, classId, 0, 1000)
      setAllResults(data.content)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load class exam results')
    } finally {
      setLoading(false)
    }
  }, [organizationId, examId, classId])

  useEffect(() => {
    fetchResults()
  }, [fetchResults])

  const filteredResults = useMemo(() => {
    if (!filterStudentId) return allResults
    return allResults.filter((r) => r.studentId === filterStudentId)
  }, [allResults, filterStudentId])

  const PAGE_SIZE = 10
  const totalPages = Math.ceil(filteredResults.length / PAGE_SIZE)
  const pagedResults = useMemo(() => {
    const start = page * PAGE_SIZE
    return filteredResults.slice(start, start + PAGE_SIZE)
  }, [filteredResults, page])

  const handleFilterStudentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterStudentId(e.target.value)
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
          onClick={() => navigate(branchId
            ? `/organizations/${organizationId}/branches/${branchId}/classes/${classId}/results`
            : `/organizations/${organizationId}/examinations/${examId}/subjects`
          )}
        >
          &larr; Back to Examinations
        </button>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title">Class Results</h1>
          {(examName || className) && (
            <p className="text-muted mb-0">
              {examName}
              {examName && className ? ' / ' : ''}
              {className}
            </p>
          )}
        </div>
      </div>

      {(className || examName) && (
        <div className="alert alert-info mb-4">
          Class: <strong>{className || '—'}</strong> | Exam: <strong>{examName || '—'}</strong>
        </div>
      )}

      {/* Student Filter */}
      <div className="row mb-3">
        <div className="col-md-4">
          <select
            className="form-select"
            value={filterStudentId}
            onChange={handleFilterStudentChange}
          >
            <option value="">All Students</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.firstName} {s.lastName} ({s.arkId})
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <LoadingSpinner />
      ) : filteredResults.length === 0 ? (
        <EmptyState message={filterStudentId ? 'No results found for the selected student.' : 'No exam results found for this class.'} />
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-hover align-middle app-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Subject</th>
                  <th>Marks</th>
                  <th>Grade</th>
                  <th>Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {pagedResults.map((result) => (
                  <tr key={result.id}>
                    <td className="fw-semibold">
                      {studentNameMap.get(result.studentId) || result.studentId}
                    </td>
                    <td>{subjectNameMap.get(result.examSubjectId) || result.examSubjectId}</td>
                    <td>
                      {result.marksObtained} / {subjectMaxMarksMap.get(result.examSubjectId) ?? '—'}
                    </td>
                    <td>{result.grade}</td>
                    <td><StatusBadge status={result.status} /></td>
                    <td>{result.remarks}</td>
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

export default ExamClassResults
