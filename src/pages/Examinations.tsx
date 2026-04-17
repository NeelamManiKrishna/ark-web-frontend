import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getExaminations,
  createExamination,
  updateExamination,
  deleteExamination,
} from '../api/examinationApi.ts'
import { getOrganizationById } from '../api/organizationApi.ts'
import { getBranchById } from '../api/branchApi.ts'
import type {
  ExaminationResponse,
  CreateExaminationRequest,
  UpdateExaminationRequest,
  ExamType,
  ExamStatus,
} from '../types/examination.ts'
import {
  required,
  minLength,
  maxLength,
  composeValidators,
  pattern,
} from '../utils/validators.ts'
import type { ValidationSchema } from '../utils/validators.ts'
import { useFormValidation } from '../hooks/useFormValidation.ts'
import { useCanWrite } from '../hooks/useCanWrite.ts'
import { useToast } from '../hooks/useToast.ts'
import { WRITE_ROLES } from '../config/roles.ts'
import StatusBadge from '../components/StatusBadge.tsx'
import Pagination from '../components/Pagination.tsx'
import Toast from '../components/Toast.tsx'
import ConfirmModal from '../components/ConfirmModal.tsx'
import Modal from '../components/Modal.tsx'
import LoadingSpinner from '../components/LoadingSpinner.tsx'
import EmptyState from '../components/EmptyState.tsx'

interface ExamFormData {
  name: string
  academicYear: string
  examType: string
  startDate: string
  endDate: string
  description: string
}

const EMPTY_FORM: ExamFormData = {
  name: '',
  academicYear: '',
  examType: '',
  startDate: '',
  endDate: '',
  description: '',
}

const EXAM_TYPE_OPTIONS: { value: ExamType; label: string }[] = [
  { value: 'MIDTERM', label: 'Midterm' },
  { value: 'FINAL', label: 'Final' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'HALF_YEARLY', label: 'Half Yearly' },
  { value: 'UNIT_TEST', label: 'Unit Test' },
  { value: 'SUPPLEMENTARY', label: 'Supplementary' },
]

const EXAM_STATUS_OPTIONS: { value: ExamStatus; label: string }[] = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

function formatExamType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

const examSchema: ValidationSchema<ExamFormData> = {
  name: composeValidators(required('Examination name'), minLength(2), maxLength(100)),
  academicYear: composeValidators(
    required('Academic year'),
    pattern(/^\d{4}-\d{4}$/, 'Enter a valid academic year (e.g. 2025-2026)'),
  ),
  examType: required('Exam type'),
  startDate: required('Start date'),
  endDate: required('End date'),
  description: maxLength(500),
}

function Examinations() {
  const { organizationId, branchId } = useParams<{
    organizationId: string
    branchId: string
  }>()
  const navigate = useNavigate()
  const canWrite = useCanWrite(WRITE_ROLES.examinations)
  const { toast, showSuccess, showError, dismiss } = useToast()

  const [orgName, setOrgName] = useState('')
  const [branchName, setBranchName] = useState('')
  const [examinations, setExaminations] = useState<ExaminationResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Filter state
  const [filterAcademicYear, setFilterAcademicYear] = useState('')

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<ExaminationResponse | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingExam, setEditingExam] = useState<ExaminationResponse | null>(null)
  const [form, setForm] = useState<ExamFormData>(EMPTY_FORM)
  const [editStatus, setEditStatus] = useState<ExamStatus>('SCHEDULED')
  const [submitting, setSubmitting] = useState(false)

  const {
    errors: formErrors,
    touched,
    validateAll,
    touchAndValidateField,
    revalidateField,
    fieldClass,
    reset: resetValidation,
  } = useFormValidation(examSchema)

  useEffect(() => {
    if (!organizationId) return
    getOrganizationById(organizationId)
      .then((org) => setOrgName(org.name))
      .catch(() => setOrgName('Unknown Organization'))
  }, [organizationId])

  useEffect(() => {
    if (!organizationId || !branchId) return
    getBranchById(organizationId, branchId)
      .then((branch) => setBranchName(branch.name))
      .catch(() => setBranchName('Unknown Branch'))
  }, [organizationId, branchId])

  const fetchExaminations = useCallback(async () => {
    if (!organizationId || !branchId) return
    setLoading(true)
    setError('')
    try {
      const data = await getExaminations(
        organizationId,
        branchId,
        page,
        10,
        filterAcademicYear || undefined,
      )
      setExaminations(data.content)
      setTotalPages(data.page.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load examinations')
    } finally {
      setLoading(false)
    }
  }, [organizationId, branchId, page, filterAcademicYear])

  useEffect(() => {
    fetchExaminations()
  }, [fetchExaminations])

  const openCreateModal = () => {
    setEditingExam(null)
    setForm(EMPTY_FORM)
    resetValidation()
    setShowModal(true)
  }

  const openEditModal = (exam: ExaminationResponse) => {
    setEditingExam(exam)
    setForm({
      name: exam.name,
      academicYear: exam.academicYear,
      examType: exam.examType,
      startDate: exam.startDate,
      endDate: exam.endDate,
      description: exam.description,
    })
    setEditStatus(exam.status)
    resetValidation()
    setShowModal(true)
  }

  const closeModal = useCallback(() => {
    setShowModal(false)
    setEditingExam(null)
    setForm(EMPTY_FORM)
    resetValidation()
  }, [resetValidation])


  const handleDelete = async () => {
    if (!deleteTarget || !organizationId) return
    setDeleting(true)
    try {
      await deleteExamination(organizationId, deleteTarget.id)
      showSuccess(`"${deleteTarget.name}" deleted successfully`)
      setDeleteTarget(null)
      fetchExaminations()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete examination')
    } finally {
      setDeleting(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    revalidateField(name as keyof ExamFormData, value)
  }

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target
    touchAndValidateField(name as keyof ExamFormData, value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organizationId || !branchId) return

    const validationErrors = validateAll(form)
    if (Object.keys(validationErrors).length > 0) return

    // Cross-field: start date must be before end date
    if (form.startDate && form.endDate && form.startDate >= form.endDate) {
      showError('Start date must be before end date')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      if (editingExam) {
        const updateData: UpdateExaminationRequest = {
          name: form.name,
          academicYear: form.academicYear,
          examType: form.examType as ExamType,
          startDate: form.startDate,
          endDate: form.endDate,
          description: form.description,
          status: editStatus,
        }
        await updateExamination(organizationId, editingExam.id, updateData)
        showSuccess('Examination updated successfully')
      } else {
        const createData: CreateExaminationRequest = {
          name: form.name,
          academicYear: form.academicYear,
          examType: form.examType as ExamType,
          startDate: form.startDate,
          endDate: form.endDate,
          description: form.description,
        }
        await createExamination(organizationId, branchId, createData)
        showSuccess('Examination created successfully')
      }
      closeModal()
      fetchExaminations()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save examination')
    } finally {
      setSubmitting(false)
    }
  }

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterAcademicYear(e.target.value)
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
          onClick={() => navigate(`/organizations/${organizationId}/branches`)}
        >
          &larr; Back to Branches
        </button>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title">Examinations</h1>
          {(orgName || branchName) && (
            <p className="text-muted mb-0">
              {orgName}
              {orgName && branchName ? ' / ' : ''}
              {branchName}
            </p>
          )}
        </div>
        {canWrite && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            + New Examination
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="row mb-3">
        <div className="col-md-3">
          <input
            type="text"
            className="form-control"
            placeholder="Filter by Academic Year (e.g. 2025-2026)"
            value={filterAcademicYear}
            onChange={handleFilterChange}
          />
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <LoadingSpinner />
      ) : examinations.length === 0 ? (
        <EmptyState message="No examinations found for this branch." />
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
                {examinations.map((exam) => (
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
                        className="btn btn-sm btn-outline-info me-2"
                        onClick={() =>
                          navigate(
                            `/organizations/${organizationId}/examinations/${exam.id}/subjects`,
                          )
                        }
                      >
                        Subjects
                      </button>
                      {canWrite && (
                        <>
                          <button
                            className="btn btn-sm btn-outline-primary me-2"
                            onClick={() => openEditModal(exam)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => setDeleteTarget(exam)}
                          >
                            Delete
                          </button>
                        </>
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        message={`Are you sure you want to delete ${deleteTarget ? deleteTarget.name : ''}?`}
        detail="This action cannot be undone."
        loading={deleting}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingExam ? 'Edit Examination' : 'New Examination'}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" form="exam-form" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingExam ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <form id="exam-form" onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="name" className="form-label">Name <span className="text-danger">*</span></label>
            <input
              id="name"
              className={fieldClass('name')}
              name="name"
              value={form.name}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter examination name"
            />
            {touched.has('name') && formErrors.name && (
              <div className="invalid-feedback">{formErrors.name}</div>
            )}
          </div>
          <div className="row mb-3">
            <div className="col-md-6">
              <label htmlFor="academicYear" className="form-label">Academic Year <span className="text-danger">*</span></label>
              <input
                id="academicYear"
                className={fieldClass('academicYear')}
                name="academicYear"
                value={form.academicYear}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g. 2025-2026"
              />
              {touched.has('academicYear') && formErrors.academicYear && (
                <div className="invalid-feedback">{formErrors.academicYear}</div>
              )}
            </div>
            <div className="col-md-6">
              <label htmlFor="examType" className="form-label">Exam Type <span className="text-danger">*</span></label>
              <select
                id="examType"
                className={fieldClass('examType')}
                name="examType"
                value={form.examType}
                onChange={handleChange}
                onBlur={handleBlur}
              >
                <option value="">Select exam type</option>
                {EXAM_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {touched.has('examType') && formErrors.examType && (
                <div className="invalid-feedback">{formErrors.examType}</div>
              )}
            </div>
          </div>
          <div className="row mb-3">
            <div className="col-md-6">
              <label htmlFor="startDate" className="form-label">Start Date <span className="text-danger">*</span></label>
              <input
                id="startDate"
                className={fieldClass('startDate')}
                name="startDate"
                type="date"
                value={form.startDate}
                onChange={handleChange}
                onBlur={handleBlur}
              />
              {touched.has('startDate') && formErrors.startDate && (
                <div className="invalid-feedback">{formErrors.startDate}</div>
              )}
            </div>
            <div className="col-md-6">
              <label htmlFor="endDate" className="form-label">End Date <span className="text-danger">*</span></label>
              <input
                id="endDate"
                className={fieldClass('endDate')}
                name="endDate"
                type="date"
                value={form.endDate}
                onChange={handleChange}
                onBlur={handleBlur}
              />
              {touched.has('endDate') && formErrors.endDate && (
                <div className="invalid-feedback">{formErrors.endDate}</div>
              )}
            </div>
          </div>
          <div className="mb-3">
            <label htmlFor="description" className="form-label">Description</label>
            <textarea
              id="description"
              className={fieldClass('description')}
              name="description"
              value={form.description}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter description"
              rows={3}
            />
            {touched.has('description') && formErrors.description && (
              <div className="invalid-feedback">{formErrors.description}</div>
            )}
          </div>
          {editingExam && (
            <div className="mb-3">
              <label htmlFor="status" className="form-label">Status</label>
              <select
                id="status"
                className="form-select"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as ExamStatus)}
              >
                {EXAM_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </form>
      </Modal>
    </div>
  )
}

export default Examinations
