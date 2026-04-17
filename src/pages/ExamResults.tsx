import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getExaminationById,
  getExamSubjects,
  getExamResults,
  createExamResult,
  updateExamResult,
} from '../api/examinationApi.ts'
import { getStudents } from '../api/studentApi.ts'
import type {
  ExamResultResponse,
  ExamResultStatus,
  ExamSubjectResponse,
} from '../types/examination.ts'
import type { StudentResponse } from '../types/student.ts'
import {
  required,
  maxLength,
  composeValidators,
} from '../utils/validators.ts'
import type { ValidationSchema } from '../utils/validators.ts'
import { useFormValidation } from '../hooks/useFormValidation.ts'
import { useCanWrite } from '../hooks/useCanWrite.ts'
import { useToast } from '../hooks/useToast.ts'
import { WRITE_ROLES } from '../config/roles.ts'
import StatusBadge from '../components/StatusBadge.tsx'
import Pagination from '../components/Pagination.tsx'
import Toast from '../components/Toast.tsx'
import Modal from '../components/Modal.tsx'
import LoadingSpinner from '../components/LoadingSpinner.tsx'
import EmptyState from '../components/EmptyState.tsx'

interface ResultFormData {
  studentId: string
  marksObtained: string
  remarks: string
}

const EMPTY_FORM: ResultFormData = {
  studentId: '',
  marksObtained: '',
  remarks: '',
}

function ExamResults() {
  const { organizationId, examId, subjectId } = useParams<{
    organizationId: string
    examId: string
    subjectId: string
  }>()
  const navigate = useNavigate()
  const canWrite = useCanWrite(WRITE_ROLES.examinations)
  const { toast, showSuccess, showError, dismiss } = useToast()

  const [examName, setExamName] = useState('')
  const [subject, setSubject] = useState<ExamSubjectResponse | null>(null)
  const [students, setStudents] = useState<StudentResponse[]>([])
  const [studentNameMap, setStudentNameMap] = useState<Map<string, string>>(new Map())
  const [results, setResults] = useState<ExamResultResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingResult, setEditingResult] = useState<ExamResultResponse | null>(null)
  const [form, setForm] = useState<ResultFormData>(EMPTY_FORM)
  const [editStatus, setEditStatus] = useState<ExamResultStatus>('PASS')
  const [submitting, setSubmitting] = useState(false)

  const resultSchema: ValidationSchema<ResultFormData> = {
    studentId: required('Student'),
    marksObtained: composeValidators(
      required('Marks obtained'),
      (value: string) => {
        if (!value.trim()) return undefined
        const num = Number(value)
        if (isNaN(num) || num < 0) return 'Marks must be a non-negative number'
        if (subject && num > subject.maxMarks) return `Marks cannot exceed ${subject.maxMarks}`
        return undefined
      },
    ),
    remarks: maxLength(500),
  }

  const {
    errors: formErrors,
    touched,
    validateAll,
    touchAndValidateField,
    revalidateField,
    fieldClass,
    reset: resetValidation,
  } = useFormValidation(resultSchema)

  const [examBranchId, setExamBranchId] = useState('')

  // Fetch exam name and branchId
  useEffect(() => {
    if (!organizationId || !examId) return
    getExaminationById(organizationId, examId)
      .then((exam) => {
        setExamName(exam.name)
        setExamBranchId(exam.branchId)
      })
      .catch(() => setExamName('Unknown Examination'))
  }, [organizationId, examId])

  // Fetch subject details
  useEffect(() => {
    if (!organizationId || !examId || !subjectId) return
    getExamSubjects(organizationId, examId, 0, 100)
      .then((data) => {
        const found = data.content.find((s) => s.id === subjectId)
        if (found) setSubject(found)
      })
      .catch(() => setSubject(null))
  }, [organizationId, examId, subjectId])

  // Fetch students scoped to the subject's class (not entire branch)
  useEffect(() => {
    if (!organizationId || !examBranchId || !subject) return
    getStudents(organizationId, 0, 1000, examBranchId, subject.classId)
      .then((data) => {
        setStudents(data.content)
        const nameMap = new Map<string, string>()
        for (const s of data.content) {
          nameMap.set(s.id, `${s.firstName} ${s.lastName} (${s.arkId})`)
        }
        setStudentNameMap(nameMap)
      })
      .catch(() => setStudents([]))
  }, [organizationId, examBranchId, subject])

  const fetchResults = useCallback(async () => {
    if (!organizationId || !examId || !subjectId) return
    setLoading(true)
    setError('')
    try {
      const data = await getExamResults(organizationId, examId, subjectId, page, 10)
      setResults(data.content)
      setTotalPages(data.page.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exam results')
    } finally {
      setLoading(false)
    }
  }, [organizationId, examId, subjectId, page])

  useEffect(() => {
    fetchResults()
  }, [fetchResults])

  const openCreateModal = () => {
    setEditingResult(null)
    setForm(EMPTY_FORM)
    resetValidation()
    setShowModal(true)
  }

  const openEditModal = (result: ExamResultResponse) => {
    setEditingResult(result)
    setForm({
      studentId: result.studentId,
      marksObtained: String(result.marksObtained),
      remarks: result.remarks,
    })
    setEditStatus(result.status)
    resetValidation()
    setShowModal(true)
  }

  const closeModal = useCallback(() => {
    setShowModal(false)
    setEditingResult(null)
    setForm(EMPTY_FORM)
    resetValidation()
  }, [resetValidation])


  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    revalidateField(name as keyof ResultFormData, value)
  }

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target
    touchAndValidateField(name as keyof ResultFormData, value)
  }

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    revalidateField(name as keyof ResultFormData, value)
  }

  const handleSelectBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
    const { name, value } = e.target
    touchAndValidateField(name as keyof ResultFormData, value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organizationId || !examId || !subjectId) return

    const validationErrors = validateAll(form)
    if (Object.keys(validationErrors).length > 0) return

    setSubmitting(true)
    setError('')
    try {
      if (editingResult) {
        await updateExamResult(organizationId, examId, editingResult.id, {
          marksObtained: Number(form.marksObtained),
          remarks: form.remarks,
          status: editStatus,
        })
        showSuccess('Result updated successfully')
      } else {
        await createExamResult(organizationId, examId, subjectId, {
          studentId: form.studentId,
          marksObtained: Number(form.marksObtained),
          remarks: form.remarks,
        })
        showSuccess('Result created successfully')
      }
      closeModal()
      fetchResults()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save result')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-container">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={dismiss} />
      )}

      <div className="mb-3">
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => navigate(`/organizations/${organizationId}/examinations/${examId}/subjects`)}
        >
          &larr; Back to Subjects
        </button>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title">Exam Results</h1>
          {(examName || subject) && (
            <p className="text-muted mb-0">
              {examName}
              {examName && subject ? ' / ' : ''}
              {subject?.subjectName}
            </p>
          )}
        </div>
        {canWrite && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            + New Result
          </button>
        )}
      </div>

      {subject && (
        <div className="alert alert-info mb-4">
          Subject: <strong>{subject.subjectName}</strong> | Max Marks: <strong>{subject.maxMarks}</strong> | Passing Marks: <strong>{subject.passingMarks}</strong>
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <LoadingSpinner />
      ) : results.length === 0 ? (
        <EmptyState message="No exam results found for this subject." />
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-hover align-middle app-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Marks Obtained</th>
                  <th>Max Marks</th>
                  <th>Grade</th>
                  <th>Status</th>
                  <th>Remarks</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.id}>
                    <td className="fw-semibold">
                      {studentNameMap.get(result.studentId) || result.studentId}
                    </td>
                    <td>{result.marksObtained} / {subject?.maxMarks ?? '—'}</td>
                    <td>{subject?.maxMarks ?? '—'}</td>
                    <td>{result.grade}</td>
                    <td><StatusBadge status={result.status} /></td>
                    <td>{result.remarks}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-secondary me-2"
                        onClick={() =>
                          navigate(
                            `/organizations/${organizationId}/examinations/${examId}/students/${result.studentId}/results`,
                          )
                        }
                      >
                        Report Card
                      </button>
                      {canWrite && (
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => openEditModal(result)}
                        >
                          Edit
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

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingResult ? 'Edit Result' : 'New Result'}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" form="result-form" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingResult ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <form id="result-form" onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="studentId" className="form-label">Student <span className="text-danger">*</span></label>
            <select
              id="studentId"
              className={fieldClass('studentId', 'form-select')}
              name="studentId"
              value={form.studentId}
              onChange={handleSelectChange}
              onBlur={handleSelectBlur}
              disabled={editingResult !== null}
            >
              <option value="">Select Student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} ({s.arkId})
                </option>
              ))}
            </select>
            {touched.has('studentId') && formErrors.studentId && (
              <div className="invalid-feedback">{formErrors.studentId}</div>
            )}
          </div>
          <div className="mb-3">
            <label htmlFor="marksObtained" className="form-label">Marks Obtained <span className="text-danger">*</span></label>
            <input
              id="marksObtained"
              className={fieldClass('marksObtained')}
              name="marksObtained"
              type="number"
              min="0"
              max={subject?.maxMarks}
              value={form.marksObtained}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter marks obtained"
            />
            {touched.has('marksObtained') && formErrors.marksObtained && (
              <div className="invalid-feedback">{formErrors.marksObtained}</div>
            )}
          </div>
          <div className="mb-3">
            <label htmlFor="remarks" className="form-label">Remarks</label>
            <textarea
              id="remarks"
              className={fieldClass('remarks')}
              name="remarks"
              value={form.remarks}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter remarks"
              rows={3}
              maxLength={500}
            />
            {touched.has('remarks') && formErrors.remarks && (
              <div className="invalid-feedback">{formErrors.remarks}</div>
            )}
          </div>
          {editingResult && (
            <div className="mb-3">
              <label htmlFor="status" className="form-label">Status</label>
              <select
                id="status"
                className="form-select"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as ExamResultStatus)}
              >
                <option value="PASS">Pass</option>
                <option value="FAIL">Fail</option>
                <option value="ABSENT">Absent</option>
                <option value="WITHHELD">Withheld</option>
              </select>
            </div>
          )}
        </form>
      </Modal>
    </div>
  )
}

export default ExamResults
