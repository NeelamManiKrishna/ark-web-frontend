import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getExaminationById,
  getExamSubjects,
  getStudentExamResults,
} from '../api/examinationApi.ts'
import { getStudents } from '../api/studentApi.ts'
import type {
  ExamResultResponse,
  ExaminationResponse,
} from '../types/examination.ts'
import type { StudentResponse } from '../types/student.ts'
import { useToast } from '../hooks/useToast.ts'
import StatusBadge from '../components/StatusBadge.tsx'
import Toast from '../components/Toast.tsx'

function StudentReportCard() {
  const { organizationId, examId, studentId } = useParams<{
    organizationId: string
    examId: string
    studentId: string
  }>()
  const navigate = useNavigate()
  const { toast, showError, dismiss } = useToast()

  const [exam, setExam] = useState<ExaminationResponse | null>(null)
  const [student, setStudent] = useState<StudentResponse | null>(null)
  const [results, setResults] = useState<ExamResultResponse[]>([])
  const [subjectNameMap, setSubjectNameMap] = useState<Map<string, string>>(new Map())
  const [subjectMaxMarksMap, setSubjectMaxMarksMap] = useState<Map<string, number>>(new Map())
  const [subjectPassingMarksMap, setSubjectPassingMarksMap] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!organizationId || !examId || !studentId) return

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        // 1. Fetch exam details
        const examData = await getExaminationById(organizationId, examId)
        setExam(examData)

        // 2. Fetch student results
        const resultsData = await getStudentExamResults(organizationId, examId, studentId)
        setResults(resultsData)

        // 3. Fetch exam subjects to build lookup maps
        const subjectsData = await getExamSubjects(organizationId, examId, 0, 100)
        const nameMap = new Map<string, string>()
        const maxMap = new Map<string, number>()
        const passMap = new Map<string, number>()
        for (const s of subjectsData.content) {
          nameMap.set(s.id, s.subjectName)
          maxMap.set(s.id, s.maxMarks)
          passMap.set(s.id, s.passingMarks)
        }
        setSubjectNameMap(nameMap)
        setSubjectMaxMarksMap(maxMap)
        setSubjectPassingMarksMap(passMap)

        // 4. Fetch students to find the specific student
        const studentsData = await getStudents(organizationId, 0, 1000, examData.branchId)
        const found = studentsData.content.find((s) => s.id === studentId)
        if (found) {
          setStudent(found)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load report card'
        setError(msg)
        showError(msg)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [organizationId, examId, studentId, showError])

  // Summary calculations
  const totalObtained = results.reduce((sum, r) => sum + r.marksObtained, 0)
  const totalMax = results.reduce((sum, r) => sum + (subjectMaxMarksMap.get(r.examSubjectId) ?? 0), 0)
  const overallPercentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : '0.0'
  const overallStatus = results.length > 0 && results.every((r) => r.status === 'PASS')
    ? 'PASS'
    : 'FAIL'

  return (
    <div className="page-container">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={dismiss} />
      )}

      <div className="mb-3">
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => navigate(
            student
              ? `/organizations/${organizationId}/branches/${student.branchId}/students/${studentId}/report-card`
              : `/organizations/${organizationId}`
          )}
        >
          &larr; Back to Examinations
        </button>
      </div>

      <div className="mb-4">
        <h1 className="page-title">Student Report Card</h1>
        {(exam || student) && (
          <p className="text-muted mb-0">
            {exam?.name}
            {exam && student ? ' / ' : ''}
            {student ? `${student.firstName} ${student.lastName}` : ''}
          </p>
        )}
      </div>

      {/* Info Banner */}
      {(student || exam) && (
        <div className="card mb-4">
          <div className="card-body">
            {student && (
              <p className="mb-1">
                <strong>Student:</strong> {student.firstName} {student.lastName} ({student.arkId})
              </p>
            )}
            {exam && (
              <p className="mb-0">
                <strong>Exam:</strong> {exam.name} | <strong>Academic Year:</strong> {exam.academicYear}
              </p>
            )}
          </div>
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <p>No results found for this student.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle app-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Max Marks</th>
                <th>Passing Marks</th>
                <th>Marks Obtained</th>
                <th>Grade</th>
                <th>Status</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.id}>
                  <td className="fw-semibold">
                    {subjectNameMap.get(result.examSubjectId) || result.examSubjectId}
                  </td>
                  <td>{subjectMaxMarksMap.get(result.examSubjectId) ?? '—'}</td>
                  <td>{subjectPassingMarksMap.get(result.examSubjectId) ?? '—'}</td>
                  <td>{result.marksObtained}</td>
                  <td>{result.grade}</td>
                  <td><StatusBadge status={result.status} /></td>
                  <td>{result.remarks}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="fw-bold table-light">
                <td>Total</td>
                <td>{totalMax}</td>
                <td>—</td>
                <td>{totalObtained}</td>
                <td>{overallPercentage}%</td>
                <td><StatusBadge status={overallStatus} /></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

export default StudentReportCard
