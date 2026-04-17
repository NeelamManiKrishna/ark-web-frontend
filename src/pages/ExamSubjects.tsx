import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getExaminationById,
  getExamSubjects,
  createExamSubject,
  updateExamSubject,
  deleteExamSubject,
} from '../api/examinationApi.ts'
import { getAcademicClasses } from '../api/academicClassApi.ts'
import type {
  ExaminationResponse,
  ExamSubjectResponse,
  UpdateExamSubjectRequest,
  ExamSubjectStatus,
} from '../types/examination.ts'
import type { AcademicClassResponse } from '../types/academicClass.ts'
import {
  required,
  minLength,
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
import ConfirmModal from '../components/ConfirmModal.tsx'
import Modal from '../components/Modal.tsx'
import LoadingSpinner from '../components/LoadingSpinner.tsx'
import EmptyState from '../components/EmptyState.tsx'

// ── Create form (batch) ──────────────────────────────────────────────
interface CreateFormData {
  subjectName: string
  subjectCode: string
  maxMarks: string
  passingMarks: string
  examDate: string
}

const EMPTY_CREATE: CreateFormData = {
  subjectName: '',
  subjectCode: '',
  maxMarks: '',
  passingMarks: '',
  examDate: '',
}

const createSchema: ValidationSchema<CreateFormData> = {
  subjectName: composeValidators(required('Subject name'), minLength(2), maxLength(100)),
  subjectCode: maxLength(20),
  maxMarks: composeValidators(
    required('Max marks'),
    (value: string) => {
      if (!value.trim()) return undefined
      const num = Number(value)
      if (!Number.isFinite(num) || num <= 0) return 'Must be a positive number'
      return undefined
    },
  ),
  passingMarks: composeValidators(
    required('Passing marks'),
    (value: string) => {
      if (!value.trim()) return undefined
      const num = Number(value)
      if (!Number.isFinite(num) || num <= 0) return 'Must be a positive number'
      return undefined
    },
  ),
  examDate: required('Exam date'),
}

// ── Edit form (single subject) ──────────────────────────────────────
interface EditFormData {
  subjectName: string
  subjectCode: string
  maxMarks: string
  passingMarks: string
  examDate: string
}

const editSchema: ValidationSchema<EditFormData> = { ...createSchema }

function ExamSubjects() {
  const { organizationId, examId } = useParams<{
    organizationId: string
    examId: string
  }>()
  const navigate = useNavigate()
  const canWrite = useCanWrite(WRITE_ROLES.examinations)
  const { toast, showSuccess, showError, dismiss } = useToast()

  const [exam, setExam] = useState<ExaminationResponse | null>(null)
  const [classes, setClasses] = useState<AcademicClassResponse[]>([])
  const [classNameMap, setClassNameMap] = useState<Map<string, string>>(new Map())
  const [subjects, setSubjects] = useState<ExamSubjectResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<ExamSubjectResponse | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Create modal (batch)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState<CreateFormData>(EMPTY_CREATE)
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set())
  const [createClassError, setCreateClassError] = useState('')
  const [createSubmitting, setCreateSubmitting] = useState(false)

  // Edit modal (single)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editTarget, setEditTarget] = useState<ExamSubjectResponse | null>(null)
  const [editForm, setEditForm] = useState<EditFormData>(EMPTY_CREATE)
  const [editStatus, setEditStatus] = useState<ExamSubjectStatus>('SCHEDULED')
  const [editSubmitting, setEditSubmitting] = useState(false)

  const createValidation = useFormValidation(createSchema)
  const editValidation = useFormValidation(editSchema)

  // Filter
  const [filterClassId, setFilterClassId] = useState('')

  // Fetch exam + classes
  useEffect(() => {
    if (!organizationId || !examId) return
    getExaminationById(organizationId, examId)
      .then((data) => {
        setExam(data)
        getAcademicClasses(organizationId, data.branchId, 0, 200)
          .then((classData) => {
            setClasses(classData.content)
            const map = new Map<string, string>()
            classData.content.forEach((cls) => {
              map.set(cls.id, cls.section ? `${cls.name} - ${cls.section}` : cls.name)
            })
            setClassNameMap(map)
          })
          .catch(() => setClasses([]))
      })
      .catch(() => setError('Failed to load examination details'))
  }, [organizationId, examId])

  const fetchSubjects = useCallback(async () => {
    if (!organizationId || !examId) return
    setLoading(true)
    setError('')
    try {
      const data = await getExamSubjects(organizationId, examId, page, 100)
      setSubjects(data.content)
      setTotalPages(data.page.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exam subjects')
    } finally {
      setLoading(false)
    }
  }, [organizationId, examId, page])

  useEffect(() => {
    fetchSubjects()
  }, [fetchSubjects])

  // Group subjects by class for display
  const subjectGroups = useMemo(() => {
    const filtered = filterClassId
      ? subjects.filter((s) => s.classId === filterClassId)
      : subjects
    const groups = new Map<string, ExamSubjectResponse[]>()
    for (const s of filtered) {
      if (!groups.has(s.classId)) groups.set(s.classId, [])
      groups.get(s.classId)!.push(s)
    }
    return [...groups.entries()].sort((a, b) => {
      const nameA = classNameMap.get(a[0]) ?? a[0]
      const nameB = classNameMap.get(b[0]) ?? b[0]
      return nameA.localeCompare(nameB)
    })
  }, [subjects, filterClassId, classNameMap])

  // Already-assigned: set of "classId|subjectName" for showing hints
  const assignedKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const s of subjects) keys.add(`${s.classId}|${s.subjectName.toLowerCase()}`)
    return keys
  }, [subjects])

  // ── Class checklist helpers ──
  const toggleClass = (classId: string) => {
    setSelectedClassIds((prev) => {
      const next = new Set(prev)
      if (next.has(classId)) next.delete(classId)
      else next.add(classId)
      return next
    })
    setCreateClassError('')
  }

  const toggleAll = () => {
    if (selectedClassIds.size === classes.length) {
      setSelectedClassIds(new Set())
    } else {
      setSelectedClassIds(new Set(classes.map((c) => c.id)))
    }
    setCreateClassError('')
  }

  // ── Create (batch) ──
  const openCreateModal = () => {
    setCreateForm(EMPTY_CREATE)
    setSelectedClassIds(new Set())
    setCreateClassError('')
    createValidation.reset()
    setShowCreateModal(true)
  }

  const handleCreateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setCreateForm((prev) => ({ ...prev, [name]: value }))
    createValidation.revalidateField(name as keyof CreateFormData, value)
  }

  const handleCreateBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    createValidation.touchAndValidateField(name as keyof CreateFormData, value)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organizationId || !examId) return

    const validationErrors = createValidation.validateAll(createForm)
    if (Object.keys(validationErrors).length > 0) return

    if (selectedClassIds.size === 0) {
      setCreateClassError('Select at least one class')
      return
    }

    if (Number(createForm.passingMarks) > Number(createForm.maxMarks)) {
      showError('Passing marks cannot exceed max marks')
      return
    }

    setCreateSubmitting(true)
    let successCount = 0
    let failCount = 0
    let skipCount = 0

    const promises = [...selectedClassIds].map(async (classId) => {
      const key = `${classId}|${createForm.subjectName.trim().toLowerCase()}`
      if (assignedKeys.has(key)) {
        skipCount++
        return
      }
      try {
        await createExamSubject(organizationId, examId, {
          classId,
          subjectName: createForm.subjectName.trim(),
          subjectCode: createForm.subjectCode.trim(),
          maxMarks: Number(createForm.maxMarks),
          passingMarks: Number(createForm.passingMarks),
          examDate: createForm.examDate,
        })
        successCount++
      } catch {
        failCount++
      }
    })

    await Promise.all(promises)
    setCreateSubmitting(false)

    const parts: string[] = []
    if (successCount > 0) parts.push(`${successCount} created`)
    if (skipCount > 0) parts.push(`${skipCount} skipped (already exists)`)
    if (failCount > 0) parts.push(`${failCount} failed`)

    if (failCount === 0) {
      showSuccess(parts.join(', '))
    } else {
      showError(parts.join(', '))
    }

    setShowCreateModal(false)
    fetchSubjects()
  }

  // ── Edit (single) ──
  const openEditModal = (subject: ExamSubjectResponse) => {
    setEditTarget(subject)
    setEditForm({
      subjectName: subject.subjectName,
      subjectCode: subject.subjectCode,
      maxMarks: String(subject.maxMarks),
      passingMarks: String(subject.passingMarks),
      examDate: subject.examDate,
    })
    setEditStatus(subject.status)
    editValidation.reset()
    setShowEditModal(true)
  }

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setEditForm((prev) => ({ ...prev, [name]: value }))
    editValidation.revalidateField(name as keyof EditFormData, value)
  }

  const handleEditBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    editValidation.touchAndValidateField(name as keyof EditFormData, value)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organizationId || !examId || !editTarget) return

    const validationErrors = editValidation.validateAll(editForm)
    if (Object.keys(validationErrors).length > 0) return

    if (Number(editForm.passingMarks) > Number(editForm.maxMarks)) {
      showError('Passing marks cannot exceed max marks')
      return
    }

    setEditSubmitting(true)
    try {
      const updateData: UpdateExamSubjectRequest = {
        subjectName: editForm.subjectName,
        subjectCode: editForm.subjectCode,
        maxMarks: Number(editForm.maxMarks),
        passingMarks: Number(editForm.passingMarks),
        examDate: editForm.examDate,
        status: editStatus,
      }
      await updateExamSubject(organizationId, examId, editTarget.id, updateData)
      showSuccess('Subject updated successfully')
      setShowEditModal(false)
      setEditTarget(null)
      fetchSubjects()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update subject')
    } finally {
      setEditSubmitting(false)
    }
  }

  // ── Delete ──
  const handleDelete = async () => {
    if (!deleteTarget || !organizationId || !examId) return
    setDeleting(true)
    try {
      await deleteExamSubject(organizationId, examId, deleteTarget.id)
      showSuccess(`"${deleteTarget.subjectName}" deleted`)
      setDeleteTarget(null)
      fetchSubjects()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete subject')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="page-container">
      {toast && <Toast message={toast.message} type={toast.type} onClose={dismiss} />}

      <div className="mb-3">
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() =>
            navigate(
              exam
                ? `/organizations/${organizationId}/branches/${exam.branchId}/examinations`
                : `/organizations/${organizationId}`,
            )
          }
        >
          &larr; Back to Examinations
        </button>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title">Exam Subjects</h1>
          {exam && <p className="text-muted mb-0">{exam.name} ({exam.academicYear})</p>}
        </div>
        {canWrite && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            + Add Subject to Classes
          </button>
        )}
      </div>

      {/* Class filter */}
      <div className="row mb-3">
        <div className="col-md-4">
          <select
            className="form-select form-select-sm"
            value={filterClassId}
            onChange={(e) => setFilterClassId(e.target.value)}
          >
            <option value="">All Classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {classNameMap.get(cls.id) ?? cls.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <LoadingSpinner />
      ) : subjectGroups.length === 0 ? (
        <EmptyState message={filterClassId ? 'No subjects found for the selected class.' : 'No exam subjects found. Add subjects using the button above.'} />
      ) : (
        <>
          {/* Grouped by class */}
          {subjectGroups.map(([classId, classSubjects]) => (
            <div key={classId} className="mb-4">
              <h6 className="text-primary border-bottom pb-1 mb-2">
                {classNameMap.get(classId) ?? classId}
                <span className="badge bg-secondary ms-2">{classSubjects.length}</span>
              </h6>
              <div className="table-responsive">
                <table className="table table-sm table-hover align-middle app-table mb-0">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Code</th>
                      <th>Max Marks</th>
                      <th>Pass Marks</th>
                      <th>Exam Date</th>
                      <th>Status</th>
                      {canWrite && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {classSubjects.map((subject) => (
                      <tr key={subject.id}>
                        <td className="fw-semibold">{subject.subjectName}</td>
                        <td>{subject.subjectCode || '—'}</td>
                        <td>{subject.maxMarks}</td>
                        <td>{subject.passingMarks}</td>
                        <td>{subject.examDate}</td>
                        <td><StatusBadge status={subject.status} /></td>
                        {canWrite && (
                          <td>
                            <button
                              className="btn btn-sm btn-outline-primary me-1"
                              onClick={() => openEditModal(subject)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => setDeleteTarget(subject)}
                            >
                              Delete
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        message={`Delete "${deleteTarget?.subjectName}" for ${classNameMap.get(deleteTarget?.classId ?? '') ?? ''}?`}
        detail="This will also delete all results for this subject."
        loading={deleting}
      />

      {/* Create (Batch) Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add Subject to Classes"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </button>
            <button type="submit" form="create-subject-form" className="btn btn-primary" disabled={createSubmitting}>
              {createSubmitting ? 'Creating...' : `Create${selectedClassIds.size > 0 ? ` (${selectedClassIds.size} classes)` : ''}`}
            </button>
          </>
        }
      >
        <form id="create-subject-form" onSubmit={handleCreateSubmit} noValidate>
          {/* Subject details */}
          <div className="mb-3">
            <label htmlFor="subjectName" className="form-label">Subject Name <span className="text-danger">*</span></label>
            <input
              id="subjectName"
              className={createValidation.fieldClass('subjectName')}
              name="subjectName"
              value={createForm.subjectName}
              onChange={handleCreateChange}
              onBlur={handleCreateBlur}
              placeholder="e.g. Mathematics"
            />
            {createValidation.touched.has('subjectName') && createValidation.errors.subjectName && (
              <div className="invalid-feedback">{createValidation.errors.subjectName}</div>
            )}
          </div>
          <div className="row mb-3">
            <div className="col-md-4">
              <label htmlFor="subjectCode" className="form-label">Code</label>
              <input
                id="subjectCode"
                className={createValidation.fieldClass('subjectCode')}
                name="subjectCode"
                value={createForm.subjectCode}
                onChange={handleCreateChange}
                onBlur={handleCreateBlur}
                placeholder="e.g. MATH101"
              />
            </div>
            <div className="col-md-4">
              <label htmlFor="maxMarks" className="form-label">Max Marks <span className="text-danger">*</span></label>
              <input
                id="maxMarks"
                className={createValidation.fieldClass('maxMarks')}
                name="maxMarks"
                type="number"
                min="1"
                value={createForm.maxMarks}
                onChange={handleCreateChange}
                onBlur={handleCreateBlur}
                placeholder="100"
              />
              {createValidation.touched.has('maxMarks') && createValidation.errors.maxMarks && (
                <div className="invalid-feedback">{createValidation.errors.maxMarks}</div>
              )}
            </div>
            <div className="col-md-4">
              <label htmlFor="passingMarks" className="form-label">Pass Marks <span className="text-danger">*</span></label>
              <input
                id="passingMarks"
                className={createValidation.fieldClass('passingMarks')}
                name="passingMarks"
                type="number"
                min="1"
                value={createForm.passingMarks}
                onChange={handleCreateChange}
                onBlur={handleCreateBlur}
                placeholder="35"
              />
              {createValidation.touched.has('passingMarks') && createValidation.errors.passingMarks && (
                <div className="invalid-feedback">{createValidation.errors.passingMarks}</div>
              )}
            </div>
          </div>
          <div className="mb-3">
            <label htmlFor="examDate" className="form-label">Exam Date <span className="text-danger">*</span></label>
            <input
              id="examDate"
              className={createValidation.fieldClass('examDate')}
              name="examDate"
              type="date"
              value={createForm.examDate}
              onChange={handleCreateChange}
              onBlur={handleCreateBlur}
            />
            {createValidation.touched.has('examDate') && createValidation.errors.examDate && (
              <div className="invalid-feedback">{createValidation.errors.examDate}</div>
            )}
          </div>

          <hr />

          {/* Class checklist */}
          <div className="mb-2 d-flex justify-content-between align-items-center">
            <label className="form-label mb-0">Select Classes <span className="text-danger">*</span></label>
            <button type="button" className="btn btn-sm btn-link p-0" onClick={toggleAll}>
              {selectedClassIds.size === classes.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          {createClassError && <div className="text-danger small mb-1">{createClassError}</div>}

          {classes.length === 0 ? (
            <p className="text-muted small">No classes found.</p>
          ) : (
            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '0.375rem', padding: '0.5rem' }}>
              {classes.map((cls) => {
                const alreadyHas = createForm.subjectName.trim()
                  ? assignedKeys.has(`${cls.id}|${createForm.subjectName.trim().toLowerCase()}`)
                  : false
                return (
                  <div key={cls.id} className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={selectedClassIds.has(cls.id)}
                      onChange={() => toggleClass(cls.id)}
                      id={`cls-${cls.id}`}
                    />
                    <label className="form-check-label small" htmlFor={`cls-${cls.id}`}>
                      {classNameMap.get(cls.id) ?? cls.name}
                      {alreadyHas && (
                        <span className="badge bg-secondary bg-opacity-25 text-secondary ms-2" style={{ fontSize: '0.65rem' }}>
                          already exists
                        </span>
                      )}
                    </label>
                  </div>
                )
              })}
            </div>
          )}

          {selectedClassIds.size > 0 && (
            <div className="mt-1">
              <small className="text-muted">{selectedClassIds.size} class{selectedClassIds.size > 1 ? 'es' : ''} selected</small>
            </div>
          )}
        </form>
      </Modal>

      {/* Edit (Single) Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setEditTarget(null) }}
        title="Edit Exam Subject"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => { setShowEditModal(false); setEditTarget(null) }}>
              Cancel
            </button>
            <button type="submit" form="edit-subject-form" className="btn btn-primary" disabled={editSubmitting}>
              {editSubmitting ? 'Saving...' : 'Update'}
            </button>
          </>
        }
      >
        <form id="edit-subject-form" onSubmit={handleEditSubmit} noValidate>
          {editTarget && (
            <p className="text-muted mb-3">
              Class: <strong>{classNameMap.get(editTarget.classId) ?? editTarget.classId}</strong>
            </p>
          )}
          <div className="mb-3">
            <label htmlFor="editSubjectName" className="form-label">Subject Name <span className="text-danger">*</span></label>
            <input
              id="editSubjectName"
              className={editValidation.fieldClass('subjectName')}
              name="subjectName"
              value={editForm.subjectName}
              onChange={handleEditChange}
              onBlur={handleEditBlur}
            />
            {editValidation.touched.has('subjectName') && editValidation.errors.subjectName && (
              <div className="invalid-feedback">{editValidation.errors.subjectName}</div>
            )}
          </div>
          <div className="row mb-3">
            <div className="col-md-4">
              <label htmlFor="editSubjectCode" className="form-label">Code</label>
              <input
                id="editSubjectCode"
                className={editValidation.fieldClass('subjectCode')}
                name="subjectCode"
                value={editForm.subjectCode}
                onChange={handleEditChange}
                onBlur={handleEditBlur}
              />
            </div>
            <div className="col-md-4">
              <label htmlFor="editMaxMarks" className="form-label">Max Marks <span className="text-danger">*</span></label>
              <input
                id="editMaxMarks"
                className={editValidation.fieldClass('maxMarks')}
                name="maxMarks"
                type="number"
                min="1"
                value={editForm.maxMarks}
                onChange={handleEditChange}
                onBlur={handleEditBlur}
              />
              {editValidation.touched.has('maxMarks') && editValidation.errors.maxMarks && (
                <div className="invalid-feedback">{editValidation.errors.maxMarks}</div>
              )}
            </div>
            <div className="col-md-4">
              <label htmlFor="editPassingMarks" className="form-label">Pass Marks <span className="text-danger">*</span></label>
              <input
                id="editPassingMarks"
                className={editValidation.fieldClass('passingMarks')}
                name="passingMarks"
                type="number"
                min="1"
                value={editForm.passingMarks}
                onChange={handleEditChange}
                onBlur={handleEditBlur}
              />
              {editValidation.touched.has('passingMarks') && editValidation.errors.passingMarks && (
                <div className="invalid-feedback">{editValidation.errors.passingMarks}</div>
              )}
            </div>
          </div>
          <div className="mb-3">
            <label htmlFor="editExamDate" className="form-label">Exam Date <span className="text-danger">*</span></label>
            <input
              id="editExamDate"
              className={editValidation.fieldClass('examDate')}
              name="examDate"
              type="date"
              value={editForm.examDate}
              onChange={handleEditChange}
              onBlur={handleEditBlur}
            />
            {editValidation.touched.has('examDate') && editValidation.errors.examDate && (
              <div className="invalid-feedback">{editValidation.errors.examDate}</div>
            )}
          </div>
          <div className="mb-3">
            <label htmlFor="editStatus" className="form-label">Status</label>
            <select
              id="editStatus"
              className="form-select"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as ExamSubjectStatus)}
            >
              <option value="SCHEDULED">Scheduled</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default ExamSubjects
