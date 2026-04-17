import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getAcademicClasses,
  createAcademicClass,
  updateAcademicClass,
  deleteAcademicClass,
} from '../api/academicClassApi.ts'
import { importAcademicClasses } from '../api/bulkImportApi.ts'
import BulkImportModal from '../components/BulkImportModal.tsx'
import { getOrganizationById } from '../api/organizationApi.ts'
import { getBranchById } from '../api/branchApi.ts'
import { getFaculty } from '../api/facultyApi.ts'
import { createFacultyAssignment } from '../api/facultyAssignmentApi.ts'
import type {
  AcademicClassResponse,
  CreateAcademicClassRequest,
  UpdateAcademicClassRequest,
  AcademicClassStatus,
} from '../types/academicClass.ts'
import type { FacultyResponse } from '../types/faculty.ts'
import type { AssignmentType } from '../types/facultyAssignment.ts'
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
import { CLASS_STATUS_OPTIONS, ASSIGNMENT_TYPE_OPTIONS } from '../constants/statuses.ts'
import StatusBadge from '../components/StatusBadge.tsx'
import SortableHeader from '../components/SortableHeader.tsx'
import Pagination from '../components/Pagination.tsx'
import Toast from '../components/Toast.tsx'
import ConfirmModal from '../components/ConfirmModal.tsx'
import Modal from '../components/Modal.tsx'

interface ClassFormData {
  name: string
  section: string
  academicYear: string
  capacity: string
  description: string
}

const EMPTY_FORM: ClassFormData = {
  name: '',
  section: '',
  academicYear: '',
  capacity: '',
  description: '',
}

const classSchema: ValidationSchema<ClassFormData> = {
  name: composeValidators(required('Class name'), minLength(2), maxLength(100)),
  section: maxLength(20),
  academicYear: composeValidators(
    required('Academic year'),
    pattern(/^\d{4}-\d{4}$/, 'Enter a valid academic year (e.g. 2025-2026)'),
  ),
  capacity: composeValidators(
    required('Capacity'),
    (value: string) => {
      if (!value.trim()) return undefined
      const num = Number(value)
      if (!Number.isInteger(num) || num <= 0) return 'Capacity must be a positive integer'
      return undefined
    },
  ),
  description: maxLength(500),
}

function Classes() {
  const { organizationId, branchId } = useParams<{
    organizationId: string
    branchId: string
  }>()
  const navigate = useNavigate()
  const canWrite = useCanWrite(WRITE_ROLES.classes)
  const { toast, showSuccess, showError, dismiss } = useToast()

  const [orgName, setOrgName] = useState('')
  const [branchName, setBranchName] = useState('')
  const [classes, setClasses] = useState<AcademicClassResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [sort, setSort] = useState('name,asc')

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<AcademicClassResponse | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [showImportModal, setShowImportModal] = useState(false)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingClass, setEditingClass] = useState<AcademicClassResponse | null>(null)
  const [form, setForm] = useState<ClassFormData>(EMPTY_FORM)
  const [editStatus, setEditStatus] = useState<AcademicClassStatus>('ACTIVE')
  const [submitting, setSubmitting] = useState(false)

  // Assign Faculty modal state
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignFacultyList, setAssignFacultyList] = useState<FacultyResponse[]>([])
  const [assignFacultyId, setAssignFacultyId] = useState('')
  const [assignType, setAssignType] = useState<AssignmentType>('SUBJECT_TEACHER')
  const [assignSubject, setAssignSubject] = useState('')
  const [assignSelectedClassIds, setAssignSelectedClassIds] = useState<Set<string>>(new Set())
  const [assignSubmitting, setAssignSubmitting] = useState(false)
  const [assignErrors, setAssignErrors] = useState<Record<string, string>>({})
  // Full class list for the assign modal (all classes in branch, not just current page)
  const [allBranchClasses, setAllBranchClasses] = useState<AcademicClassResponse[]>([])

  const {
    errors: formErrors,
    touched,
    validateAll,
    touchAndValidateField,
    revalidateField,
    fieldClass,
    reset: resetValidation,
  } = useFormValidation(classSchema)

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

  const fetchClasses = useCallback(async () => {
    if (!organizationId || !branchId) return
    setLoading(true)
    setError('')
    try {
      const data = await getAcademicClasses(organizationId, branchId, page, 10, sort)
      setClasses(data.content)
      setTotalPages(data.page.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load classes')
    } finally {
      setLoading(false)
    }
  }, [organizationId, branchId, page, sort])

  useEffect(() => {
    fetchClasses()
  }, [fetchClasses])

  useEffect(() => { setPage(0) }, [sort])

  // Group all branch classes by academic year for the assign modal
  const assignClassGroups = useMemo(() => {
    const groups = new Map<string, AcademicClassResponse[]>()
    for (const c of allBranchClasses) {
      const year = c.academicYear || 'Unknown'
      if (!groups.has(year)) groups.set(year, [])
      groups.get(year)!.push(c)
    }
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [allBranchClasses])

  const toggleAssignClass = (classId: string) => {
    setAssignSelectedClassIds((prev) => {
      const next = new Set(prev)
      if (next.has(classId)) next.delete(classId)
      else next.add(classId)
      return next
    })
    setAssignErrors((prev) => { const n = { ...prev }; delete n.classes; return n })
  }

  const toggleAssignYearGroup = (yearClasses: AcademicClassResponse[]) => {
    const ids = yearClasses.map((c) => c.id)
    const allSelected = ids.every((id) => assignSelectedClassIds.has(id))
    setAssignSelectedClassIds((prev) => {
      const next = new Set(prev)
      for (const id of ids) {
        if (allSelected) next.delete(id)
        else next.add(id)
      }
      return next
    })
    setAssignErrors((prev) => { const n = { ...prev }; delete n.classes; return n })
  }

  const openAssignModal = async () => {
    setAssignFacultyId('')
    setAssignType('SUBJECT_TEACHER')
    setAssignSubject('')
    setAssignSelectedClassIds(new Set())
    setAssignErrors({})
    setShowAssignModal(true)
    if (!organizationId || !branchId) return
    try {
      const [facultyData, classData] = await Promise.all([
        getFaculty(organizationId, 0, 200, branchId),
        getAcademicClasses(organizationId, branchId, 0, 200),
      ])
      setAssignFacultyList(facultyData.content)
      setAllBranchClasses(classData.content)
    } catch {
      setAssignFacultyList([])
      setAllBranchClasses([])
    }
  }

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organizationId || !branchId) return
    const errors: Record<string, string> = {}
    if (!assignFacultyId) errors.faculty = 'Select a faculty member'
    if (assignSelectedClassIds.size === 0) errors.classes = 'Select at least one class'
    if (assignType !== 'CLASS_TEACHER' && !assignSubject.trim()) errors.subject = 'Subject is required for this type'
    setAssignErrors(errors)
    if (Object.keys(errors).length > 0) return

    setAssignSubmitting(true)
    let successCount = 0
    let failCount = 0
    try {
      const promises = [...assignSelectedClassIds].map(async (classId) => {
        const cls = allBranchClasses.find((c) => c.id === classId)
        try {
          await createFacultyAssignment(organizationId, branchId, {
            facultyId: assignFacultyId,
            classId,
            academicYear: cls?.academicYear ?? '',
            assignmentType: assignType,
            subjectName: assignType !== 'CLASS_TEACHER' ? assignSubject.trim() : undefined,
          })
          successCount++
        } catch {
          failCount++
        }
      })
      await Promise.all(promises)
      if (failCount === 0) {
        showSuccess(`${successCount} assignment${successCount > 1 ? 's' : ''} created successfully`)
      } else {
        showError(`${successCount} created, ${failCount} failed (may already exist)`)
      }
      setShowAssignModal(false)
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create assignments')
    } finally {
      setAssignSubmitting(false)
    }
  }

  const openCreateModal = () => {
    setEditingClass(null)
    setForm(EMPTY_FORM)
    resetValidation()
    setShowModal(true)
  }

  const openEditModal = (cls: AcademicClassResponse) => {
    setEditingClass(cls)
    setForm({
      name: cls.name,
      section: cls.section,
      academicYear: cls.academicYear,
      capacity: String(cls.capacity),
      description: cls.description,
    })
    setEditStatus(cls.status)
    resetValidation()
    setShowModal(true)
  }

  const closeModal = useCallback(() => {
    setShowModal(false)
    setEditingClass(null)
    setForm(EMPTY_FORM)
    resetValidation()
  }, [resetValidation])


  const handleDelete = async () => {
    if (!deleteTarget || !organizationId || !branchId) return
    setDeleting(true)
    try {
      await deleteAcademicClass(organizationId, branchId, deleteTarget.id)
      showSuccess(`"${deleteTarget.name}" deleted successfully`)
      setDeleteTarget(null)
      fetchClasses()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete class')
    } finally {
      setDeleting(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    revalidateField(name as keyof ClassFormData, value)
  }

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target
    touchAndValidateField(name as keyof ClassFormData, value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organizationId || !branchId) return

    const validationErrors = validateAll(form)
    if (Object.keys(validationErrors).length > 0) return

    setSubmitting(true)
    setError('')
    try {
      if (editingClass) {
        const updateData: UpdateAcademicClassRequest = {
          name: form.name,
          section: form.section,
          academicYear: form.academicYear,
          capacity: Number(form.capacity),
          description: form.description,
          status: editStatus,
        }
        await updateAcademicClass(organizationId, branchId, editingClass.id, updateData)
        showSuccess('Class updated successfully')
      } else {
        const createData: CreateAcademicClassRequest = {
          name: form.name,
          section: form.section,
          academicYear: form.academicYear,
          capacity: Number(form.capacity),
          description: form.description,
        }
        await createAcademicClass(organizationId, branchId, createData)
        showSuccess('Class created successfully')
      }
      closeModal()
      fetchClasses()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save class')
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
          onClick={() => navigate(`/organizations/${organizationId}/branches`)}
        >
          &larr; Back to Branches
        </button>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title">Classes</h1>
          {(orgName || branchName) && (
            <p className="text-muted mb-0">
              {orgName}
              {orgName && branchName ? ' / ' : ''}
              {branchName}
            </p>
          )}
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-secondary"
            onClick={() => navigate(`/organizations/${organizationId}/branches/${branchId}/class-progression`)}
          >
            Progression
          </button>
          {canWrite && (
            <button className="btn btn-outline-primary" onClick={openAssignModal}>
              Assign Faculty
            </button>
          )}
          {canWrite && (
            <button className="btn btn-outline-primary" onClick={() => setShowImportModal(true)}>
              Import CSV
            </button>
          )}
          {canWrite && (
            <button className="btn btn-primary" onClick={openCreateModal}>
              + New Class
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <p>No classes found for this branch.</p>
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-hover align-middle app-table">
              <thead>
                <tr>
                  <SortableHeader label="Name" field="name" currentSort={sort} onSort={setSort} />
                  <SortableHeader label="Section" field="section" currentSort={sort} onSort={setSort} />
                  <SortableHeader label="Academic Year" field="academicYear" currentSort={sort} onSort={setSort} />
                  <th>Capacity</th>
                  <SortableHeader label="Status" field="status" currentSort={sort} onSort={setSort} />
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((cls) => (
                  <tr key={cls.id}>
                    <td className="fw-semibold">{cls.name}</td>
                    <td>{cls.section}</td>
                    <td>{cls.academicYear}</td>
                    <td>{cls.capacity}</td>
                    <td><StatusBadge status={cls.status} /></td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-success me-2"
                        onClick={() => navigate(`/organizations/${organizationId}/branches/${branchId}/classes/${cls.id}/enrollments`)}
                      >
                        Roster
                      </button>
                      <button
                        className="btn btn-sm btn-outline-secondary me-2"
                        onClick={() => navigate(`/organizations/${organizationId}/branches/${branchId}/classes/${cls.id}/faculty`)}
                      >
                        Faculty
                      </button>
                      <button
                        className="btn btn-sm btn-outline-info me-2"
                        onClick={() => navigate(`/organizations/${organizationId}/branches/${branchId}/classes/${cls.id}/enter-marks`)}
                      >
                        Enter Marks
                      </button>
                      <button
                        className="btn btn-sm btn-outline-secondary me-2"
                        onClick={() => navigate(`/organizations/${organizationId}/branches/${branchId}/classes/${cls.id}/results`)}
                      >
                        Results
                      </button>
                      <button
                        className="btn btn-sm btn-outline-warning me-2"
                        onClick={() => navigate(`/organizations/${organizationId}/branches/${branchId}/classes/${cls.id}/promotions`)}
                      >
                        Promote
                      </button>
                      {canWrite && (
                        <>
                          <button
                            className="btn btn-sm btn-outline-primary me-2"
                            onClick={() => openEditModal(cls)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => setDeleteTarget(cls)}
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

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Classes"
        entityType="academic-classes"
        organizationId={organizationId!}
        onImport={(file) => importAcademicClasses(organizationId!, file)}
        onComplete={fetchClasses}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingClass ? 'Edit Class' : 'New Class'}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" form="class-form" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingClass ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <form id="class-form" onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="name" className="form-label">Name <span className="text-danger">*</span></label>
            <input
              id="name"
              className={fieldClass('name')}
              name="name"
              value={form.name}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter class name"
            />
            {touched.has('name') && formErrors.name && (
              <div className="invalid-feedback">{formErrors.name}</div>
            )}
          </div>
          <div className="mb-3">
            <label htmlFor="section" className="form-label">Section</label>
            <input
              id="section"
              className={fieldClass('section')}
              name="section"
              value={form.section}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter section (e.g. A, B)"
            />
            {touched.has('section') && formErrors.section && (
              <div className="invalid-feedback">{formErrors.section}</div>
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
              <label htmlFor="capacity" className="form-label">Capacity <span className="text-danger">*</span></label>
              <input
                id="capacity"
                className={fieldClass('capacity')}
                name="capacity"
                type="number"
                min="1"
                step="1"
                value={form.capacity}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g. 30"
              />
              {touched.has('capacity') && formErrors.capacity && (
                <div className="invalid-feedback">{formErrors.capacity}</div>
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
          {editingClass && (
            <div className="mb-3">
              <label htmlFor="status" className="form-label">Status</label>
              <select
                id="status"
                className="form-select"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as AcademicClassStatus)}
              >
                {CLASS_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}
        </form>
      </Modal>

      {/* Assign Faculty Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Assign Faculty to Classes"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>
              Cancel
            </button>
            <button type="submit" form="assign-faculty-form" className="btn btn-primary" disabled={assignSubmitting}>
              {assignSubmitting ? 'Assigning...' : `Assign${assignSelectedClassIds.size > 0 ? ` (${assignSelectedClassIds.size})` : ''}`}
            </button>
          </>
        }
      >
        <form id="assign-faculty-form" onSubmit={handleAssignSubmit} noValidate>
          {/* Faculty selection */}
          <div className="mb-3">
            <label htmlFor="assignFaculty" className="form-label">Faculty Member <span className="text-danger">*</span></label>
            <select
              id="assignFaculty"
              className={`form-select${assignErrors.faculty ? ' is-invalid' : ''}`}
              value={assignFacultyId}
              onChange={(e) => { setAssignFacultyId(e.target.value); setAssignErrors((prev) => { const n = { ...prev }; delete n.faculty; return n }) }}
            >
              <option value="">Select Faculty</option>
              {assignFacultyList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.firstName} {f.lastName}{f.department ? ` — ${f.department}` : ''}
                </option>
              ))}
            </select>
            {assignErrors.faculty && <div className="invalid-feedback">{assignErrors.faculty}</div>}
          </div>

          {/* Type and Subject */}
          <div className="row mb-3">
            <div className={assignType !== 'CLASS_TEACHER' ? 'col-md-6' : 'col-12'}>
              <label htmlFor="assignType" className="form-label">Assignment Type <span className="text-danger">*</span></label>
              <select
                id="assignType"
                className="form-select"
                value={assignType}
                onChange={(e) => setAssignType(e.target.value as AssignmentType)}
              >
                {ASSIGNMENT_TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            {assignType !== 'CLASS_TEACHER' && (
              <div className="col-md-6">
                <label htmlFor="assignSubject" className="form-label">Subject <span className="text-danger">*</span></label>
                <input
                  id="assignSubject"
                  className={`form-control${assignErrors.subject ? ' is-invalid' : ''}`}
                  value={assignSubject}
                  onChange={(e) => { setAssignSubject(e.target.value); setAssignErrors((prev) => { const n = { ...prev }; delete n.subject; return n }) }}
                  placeholder="e.g. Mathematics"
                />
                {assignErrors.subject && <div className="invalid-feedback">{assignErrors.subject}</div>}
              </div>
            )}
          </div>

          {/* Class checklist grouped by year */}
          <div className="mb-2">
            <label className="form-label">Select Classes <span className="text-danger">*</span></label>
            {assignErrors.classes && (
              <div className="text-danger small mb-1">{assignErrors.classes}</div>
            )}
          </div>

          {assignClassGroups.length === 0 ? (
            <p className="text-muted small">No classes found in this branch.</p>
          ) : (
            <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '0.375rem', padding: '0.5rem' }}>
              {assignClassGroups.map(([year, yearClasses]) => {
                const yearIds = yearClasses.map((c) => c.id)
                const allSelected = yearIds.every((id) => assignSelectedClassIds.has(id))
                const someSelected = yearIds.some((id) => assignSelectedClassIds.has(id))
                return (
                  <div key={year} className="mb-2">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
                        onChange={() => toggleAssignYearGroup(yearClasses)}
                        id={`assign-year-${year}`}
                      />
                      <label className="form-check-label fw-semibold small" htmlFor={`assign-year-${year}`}>
                        {year}
                      </label>
                    </div>
                    <div className="ps-4">
                      {yearClasses.map((cls) => (
                        <div key={cls.id} className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={assignSelectedClassIds.has(cls.id)}
                            onChange={() => toggleAssignClass(cls.id)}
                            id={`assign-class-${cls.id}`}
                          />
                          <label className="form-check-label small" htmlFor={`assign-class-${cls.id}`}>
                            {cls.name} - {cls.section}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {assignSelectedClassIds.size > 0 && (
            <div className="mt-2">
              <small className="text-muted">{assignSelectedClassIds.size} class{assignSelectedClassIds.size > 1 ? 'es' : ''} selected</small>
            </div>
          )}
        </form>
      </Modal>
    </div>
  )
}

export default Classes
