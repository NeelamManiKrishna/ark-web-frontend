import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
} from '../api/studentApi.ts'
import { importStudents } from '../api/bulkImportApi.ts'
import BulkImportModal from '../components/BulkImportModal.tsx'
import { getAcademicClasses } from '../api/academicClassApi.ts'
import { getActiveEnrollment } from '../api/enrollmentApi.ts'
import { getOrganizationById } from '../api/organizationApi.ts'
import { getBranchById } from '../api/branchApi.ts'
import { useToast } from '../hooks/useToast.ts'
import type {
  StudentResponse,
  CreateStudentRequest,
  UpdateStudentRequest,
  StudentStatus,
} from '../types/student.ts'
import type { AcademicClassResponse } from '../types/academicClass.ts'
import {
  required,
  minLength,
  maxLength,
  email,
  phone,
  composeValidators,
  pattern,
} from '../utils/validators.ts'
import type { ValidationSchema } from '../utils/validators.ts'
import { useFormValidation } from '../hooks/useFormValidation.ts'
import { useCanWrite } from '../hooks/useCanWrite.ts'
import { WRITE_ROLES } from '../config/roles.ts'
import { STUDENT_STATUS_OPTIONS, GENDER_OPTIONS, GOVT_ID_TYPE_OPTIONS } from '../constants/statuses.ts'
import StatusBadge from '../components/StatusBadge.tsx'
import SortableHeader from '../components/SortableHeader.tsx'
import Pagination from '../components/Pagination.tsx'
import Toast from '../components/Toast.tsx'
import ConfirmModal from '../components/ConfirmModal.tsx'
import Modal from '../components/Modal.tsx'

const EMPTY_FORM: CreateStudentRequest = {
  branchId: '',
  classId: '',
  academicYear: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: '',
  govtIdType: '',
  govtIdNumber: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  guardianName: '',
  guardianPhone: '',
  guardianEmail: '',
  enrollmentDate: '',
}

const baseStudentSchema: ValidationSchema<CreateStudentRequest> = {
  branchId: () => undefined,
  classId: required('Class'),
  academicYear: composeValidators(required('Academic year'), pattern(/^\d{4}-\d{4}$/, 'Format: YYYY-YYYY (e.g. 2025-2026)')),
  firstName: composeValidators(required('First name'), minLength(2), maxLength(50)),
  lastName: composeValidators(required('Last name'), minLength(2), maxLength(50)),
  email: email(),
  phone: phone(),
  dateOfBirth: required('Date of birth'),
  gender: required('Gender'),
  govtIdType: required('Govt ID type'),
  govtIdNumber: composeValidators(required('Govt ID number'), maxLength(50)),
  address: maxLength(255),
  city: maxLength(100),
  state: maxLength(100),
  zipCode: pattern(/^[\w\s-]{3,10}$/, 'Enter a valid zip/postal code'),
  guardianName: maxLength(100),
  guardianPhone: phone(),
  guardianEmail: email(),
  enrollmentDate: required('Enrollment date'),
}

const editStudentSchema: ValidationSchema<CreateStudentRequest> = {
  ...baseStudentSchema,
  academicYear: () => undefined, // create-only
  govtIdType: () => undefined, // optional on update
  govtIdNumber: maxLength(50), // optional on update
}

function Students() {
  const { organizationId, branchId } = useParams<{ organizationId: string; branchId: string }>()
  const navigate = useNavigate()
  const canWrite = useCanWrite(WRITE_ROLES.students)

  const { toast, showSuccess, showError, dismiss } = useToast()

  const [orgName, setOrgName] = useState('')
  const [branchName, setBranchName] = useState('')
  const [students, setStudents] = useState<StudentResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const [sort, setSort] = useState('firstName,asc')

  // Filter state (class only — branch is from URL)
  const [filterClassId, setFilterClassId] = useState('')
  const [filterClasses, setFilterClasses] = useState<AcademicClassResponse[]>([])

  // Name lookup map for classes
  const [classNameMap, setClassNameMap] = useState<Map<string, string>>(new Map())
  // Student → classId from active enrollment (source of truth)
  const [enrollmentClassMap, setEnrollmentClassMap] = useState<Map<string, string>>(new Map())

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<StudentResponse | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [showImportModal, setShowImportModal] = useState(false)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingStudent, setEditingStudent] = useState<StudentResponse | null>(null)
  const [form, setForm] = useState<CreateStudentRequest>(EMPTY_FORM)
  const [editStatus, setEditStatus] = useState<StudentStatus>('ACTIVE')
  const [submitting, setSubmitting] = useState(false)

  // Modal class list
  const [modalClasses, setModalClasses] = useState<AcademicClassResponse[]>([])

  const activeSchema = editingStudent ? editStudentSchema : baseStudentSchema

  const {
    errors: formErrors,
    touched,
    validateAll,
    touchAndValidateField,
    revalidateField,
    fieldClass,
    reset: resetValidation,
  } = useFormValidation(activeSchema)

  // Fetch org name
  useEffect(() => {
    if (!organizationId) return
    getOrganizationById(organizationId)
      .then((org) => setOrgName(org.name))
      .catch(() => setOrgName('Unknown Organization'))
  }, [organizationId])

  // Fetch branch name
  useEffect(() => {
    if (!organizationId || !branchId) return
    getBranchById(organizationId, branchId)
      .then((branch) => setBranchName(branch.name))
      .catch(() => setBranchName('Unknown Branch'))
  }, [organizationId, branchId])

  // Fetch classes for the branch (filter + name lookup)
  useEffect(() => {
    if (!organizationId || !branchId) return
    getAcademicClasses(organizationId, branchId, 0, 100)
      .then((data) => {
        setFilterClasses(data.content)
        const map = new Map<string, string>()
        for (const c of data.content) map.set(c.id, `${c.name} - ${c.section}`)
        setClassNameMap(map)
      })
      .catch(() => setFilterClasses([]))
  }, [organizationId, branchId])

  const fetchStudents = useCallback(async () => {
    if (!organizationId || !branchId) return
    setLoading(true)
    setError('')
    try {
      const data = await getStudents(
        organizationId,
        page,
        10,
        branchId,
        filterClassId || undefined,
        sort,
      )
      setStudents(data.content)
      setTotalPages(data.page.totalPages)

      // Batch-fetch active enrollments to resolve class for each student
      const enrollMap = new Map<string, string>()
      const enrollPromises = data.content.map(async (s) => {
        try {
          const enrollment = await getActiveEnrollment(organizationId, branchId, s.id)
          enrollMap.set(s.id, enrollment.classId)
        } catch { /* no active enrollment */ }
      })
      await Promise.all(enrollPromises)
      setEnrollmentClassMap(enrollMap)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }, [organizationId, branchId, page, filterClassId, sort])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  useEffect(() => { setPage(0) }, [sort])

  const handleFilterClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterClassId(e.target.value)
    setPage(0)
  }

  // Fetch classes for modal based on branch
  const fetchModalClasses = useCallback(async (brId: string) => {
    if (!organizationId || !brId) {
      setModalClasses([])
      return
    }
    try {
      const data = await getAcademicClasses(organizationId, brId, 0, 100)
      setModalClasses(data.content)
    } catch {
      setModalClasses([])
    }
  }, [organizationId])

  const openCreateModal = () => {
    setEditingStudent(null)
    setForm({ ...EMPTY_FORM, branchId: branchId || '' })
    resetValidation()
    if (branchId) fetchModalClasses(branchId)
    setShowModal(true)
  }

  const openEditModal = (student: StudentResponse) => {
    setEditingStudent(student)
    setForm({
      branchId: student.branchId,
      classId: student.classId,
      academicYear: '',
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      phone: student.phone,
      dateOfBirth: student.dateOfBirth,
      gender: student.gender,
      govtIdType: student.govtIdType ?? '',
      govtIdNumber: student.govtIdNumber ?? '',
      address: student.address,
      city: student.city,
      state: student.state,
      zipCode: student.zipCode,
      guardianName: student.guardianName,
      guardianPhone: student.guardianPhone,
      guardianEmail: student.guardianEmail,
      enrollmentDate: student.enrollmentDate,
    })
    setEditStatus(student.status)
    resetValidation()
    fetchModalClasses(student.branchId)
    setShowModal(true)
  }

  const closeModal = useCallback(() => {
    setShowModal(false)
    setEditingStudent(null)
    setForm(EMPTY_FORM)
    setModalClasses([])
    resetValidation()
  }, [resetValidation])


  const handleDelete = async () => {
    if (!deleteTarget || !organizationId) return
    setDeleting(true)
    try {
      await deleteStudent(organizationId, deleteTarget.id)
      showSuccess(`"${deleteTarget.firstName} ${deleteTarget.lastName}" deleted successfully`)
      setDeleteTarget(null)
      fetchStudents()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete student')
    } finally {
      setDeleting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    revalidateField(name as keyof CreateStudentRequest, value)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    touchAndValidateField(name as keyof CreateStudentRequest, value)
  }

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    revalidateField(name as keyof CreateStudentRequest, value)
  }

  const handleSelectBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
    const { name, value } = e.target
    touchAndValidateField(name as keyof CreateStudentRequest, value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organizationId) return

    const validationErrors = validateAll(form)
    if (Object.keys(validationErrors).length > 0) return

    setSubmitting(true)
    setError('')
    try {
      if (editingStudent) {
        // academicYear and classId are create-only; strip from update payload (enrollment is source of truth for class)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { academicYear: _ay, classId: _cid, ...rest } = form
        const updateData: UpdateStudentRequest = { ...rest, status: editStatus }
        await updateStudent(organizationId, editingStudent.id, updateData)
        showSuccess('Student updated successfully')
      } else {
        await createStudent(organizationId, form)
        showSuccess('Student created successfully')
      }
      closeModal()
      fetchStudents()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save student')
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
          onClick={() => navigate(`/organizations/${organizationId}/branches/${branchId}/classes`)}
        >
          &larr; Back to Classes
        </button>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title">Students</h1>
          {(orgName || branchName) && (
            <p className="text-muted mb-0">
              {orgName}
              {orgName && branchName ? ' / ' : ''}
              {branchName}
            </p>
          )}
        </div>
        {canWrite && (
          <div className="d-flex gap-2">
            <button className="btn btn-outline-primary" onClick={() => setShowImportModal(true)}>
              Import CSV
            </button>
            <button className="btn btn-primary" onClick={openCreateModal}>
              + New Student
            </button>
          </div>
        )}
      </div>

      {/* Class Filter */}
      <div className="row mb-3">
        <div className="col-md-4">
          <select
            className="form-select"
            value={filterClassId}
            onChange={handleFilterClassChange}
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
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <p>No students found.</p>
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-hover align-middle app-table">
              <thead>
                <tr>
                  <th>ARK ID</th>
                  <SortableHeader label="Name" field="firstName" currentSort={sort} onSort={setSort} />
                  <SortableHeader label="Email" field="email" currentSort={sort} onSort={setSort} />
                  <th>Phone</th>
                  <th>Class</th>
                  <SortableHeader label="Status" field="status" currentSort={sort} onSort={setSort} />
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td><code>{student.arkId}</code></td>
                    <td className="fw-semibold">{student.firstName} {student.lastName}</td>
                    <td>{student.email}</td>
                    <td>{student.phone}</td>
                    <td>{classNameMap.get(enrollmentClassMap.get(student.id) ?? student.classId) ?? '—'}</td>
                    <td><StatusBadge status={student.status} /></td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-success me-2"
                        onClick={() => navigate(`/organizations/${organizationId}/branches/${branchId}/students/${student.id}/enrollments`)}
                      >
                        History
                      </button>
                      <button
                        className="btn btn-sm btn-outline-info me-2"
                        onClick={() => navigate(`/organizations/${organizationId}/branches/${branchId}/students/${student.id}/report-card`)}
                      >
                        Report Card
                      </button>
                      {canWrite && (
                        <>
                          <button
                            className="btn btn-sm btn-outline-primary me-2"
                            onClick={() => openEditModal(student)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => setDeleteTarget(student)}
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
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        message={`Are you sure you want to delete "${deleteTarget?.firstName} ${deleteTarget?.lastName}"?`}
        detail="This action cannot be undone."
        loading={deleting}
      />

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Students"
        entityType="students"
        organizationId={organizationId!}
        onImport={(file) => importStudents(organizationId!, file)}
        onComplete={fetchStudents}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingStudent ? 'Edit Student' : 'New Student'}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" form="student-form" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingStudent ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <form id="student-form" onSubmit={handleSubmit} noValidate>
          {/* Row 1: Class & Academic Year */}
          <div className="row mb-3">
            <div className="col-md-6">
              <label htmlFor="classId" className="form-label">Class <span className="text-danger">*</span></label>
              <select
                id="classId"
                className={fieldClass('classId', 'form-select')}
                name="classId"
                value={form.classId}
                onChange={handleSelectChange}
                onBlur={handleSelectBlur}
              >
                <option value="">Select Class</option>
                {modalClasses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
                ))}
              </select>
              {touched.has('classId') && formErrors.classId && (
                <div className="invalid-feedback">{formErrors.classId}</div>
              )}
            </div>
            {!editingStudent && (
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
            )}
          </div>

          {/* Row 2: First Name, Last Name */}
          <div className="row mb-3">
            <div className="col-md-6">
              <label htmlFor="firstName" className="form-label">First Name <span className="text-danger">*</span></label>
              <input
                id="firstName"
                className={fieldClass('firstName')}
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="First name"
              />
              {touched.has('firstName') && formErrors.firstName && (
                <div className="invalid-feedback">{formErrors.firstName}</div>
              )}
            </div>
            <div className="col-md-6">
              <label htmlFor="lastName" className="form-label">Last Name <span className="text-danger">*</span></label>
              <input
                id="lastName"
                className={fieldClass('lastName')}
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Last name"
              />
              {touched.has('lastName') && formErrors.lastName && (
                <div className="invalid-feedback">{formErrors.lastName}</div>
              )}
            </div>
          </div>

          {/* Row 3: Email, Phone */}
          <div className="row mb-3">
            <div className="col-md-6">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                id="email"
                className={fieldClass('email')}
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g. student@school.edu"
              />
              {touched.has('email') && formErrors.email && (
                <div className="invalid-feedback">{formErrors.email}</div>
              )}
            </div>
            <div className="col-md-6">
              <label htmlFor="phone" className="form-label">Phone</label>
              <input
                id="phone"
                className={fieldClass('phone')}
                name="phone"
                value={form.phone}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g. +1 (555) 123-4567"
              />
              {touched.has('phone') && formErrors.phone && (
                <div className="invalid-feedback">{formErrors.phone}</div>
              )}
            </div>
          </div>

          {/* Row 4: Date of Birth, Gender, Enrollment Date */}
          <div className="row mb-3">
            <div className="col-md-4">
              <label htmlFor="dateOfBirth" className="form-label">Date of Birth <span className="text-danger">*</span></label>
              <input
                id="dateOfBirth"
                className={fieldClass('dateOfBirth')}
                name="dateOfBirth"
                type="date"
                value={form.dateOfBirth}
                onChange={handleChange}
                onBlur={handleBlur}
              />
              {touched.has('dateOfBirth') && formErrors.dateOfBirth && (
                <div className="invalid-feedback">{formErrors.dateOfBirth}</div>
              )}
            </div>
            <div className="col-md-4">
              <label htmlFor="gender" className="form-label">Gender <span className="text-danger">*</span></label>
              <select
                id="gender"
                className={fieldClass('gender', 'form-select')}
                name="gender"
                value={form.gender}
                onChange={handleSelectChange}
                onBlur={handleSelectBlur}
              >
                <option value="">Select Gender</option>
                {GENDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {touched.has('gender') && formErrors.gender && (
                <div className="invalid-feedback">{formErrors.gender}</div>
              )}
            </div>
            <div className="col-md-4">
              <label htmlFor="enrollmentDate" className="form-label">Enrollment Date <span className="text-danger">*</span></label>
              <input
                id="enrollmentDate"
                className={fieldClass('enrollmentDate')}
                name="enrollmentDate"
                type="date"
                value={form.enrollmentDate}
                onChange={handleChange}
                onBlur={handleBlur}
              />
              {touched.has('enrollmentDate') && formErrors.enrollmentDate && (
                <div className="invalid-feedback">{formErrors.enrollmentDate}</div>
              )}
            </div>
          </div>

          {/* Row 5: Government ID */}
          <div className="row mb-3">
            <div className="col-md-6">
              <label htmlFor="govtIdType" className="form-label">Govt ID Type <span className="text-danger">*</span></label>
              <select
                id="govtIdType"
                className={fieldClass('govtIdType', 'form-select')}
                name="govtIdType"
                value={form.govtIdType ?? ''}
                onChange={handleSelectChange}
                onBlur={handleSelectBlur}
              >
                <option value="">Select ID Type</option>
                {GOVT_ID_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {touched.has('govtIdType') && formErrors.govtIdType && (
                <div className="invalid-feedback">{formErrors.govtIdType}</div>
              )}
            </div>
            <div className="col-md-6">
              <label htmlFor="govtIdNumber" className="form-label">Govt ID Number <span className="text-danger">*</span></label>
              <input
                id="govtIdNumber"
                className={fieldClass('govtIdNumber')}
                name="govtIdNumber"
                value={form.govtIdNumber ?? ''}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g. 1234-5678-9012"
              />
              {touched.has('govtIdNumber') && formErrors.govtIdNumber && (
                <div className="invalid-feedback">{formErrors.govtIdNumber}</div>
              )}
            </div>
          </div>

          {/* Row 6: Guardian Name, Guardian Phone, Guardian Email */}
          <div className="row mb-3">
            <div className="col-md-4">
              <label htmlFor="guardianName" className="form-label">Guardian Name</label>
              <input
                id="guardianName"
                className={fieldClass('guardianName')}
                name="guardianName"
                value={form.guardianName}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Guardian name"
              />
              {touched.has('guardianName') && formErrors.guardianName && (
                <div className="invalid-feedback">{formErrors.guardianName}</div>
              )}
            </div>
            <div className="col-md-4">
              <label htmlFor="guardianPhone" className="form-label">Guardian Phone</label>
              <input
                id="guardianPhone"
                className={fieldClass('guardianPhone')}
                name="guardianPhone"
                value={form.guardianPhone}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g. +1 (555) 123-4567"
              />
              {touched.has('guardianPhone') && formErrors.guardianPhone && (
                <div className="invalid-feedback">{formErrors.guardianPhone}</div>
              )}
            </div>
            <div className="col-md-4">
              <label htmlFor="guardianEmail" className="form-label">Guardian Email</label>
              <input
                id="guardianEmail"
                className={fieldClass('guardianEmail')}
                name="guardianEmail"
                type="email"
                value={form.guardianEmail}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="guardian@email.com"
              />
              {touched.has('guardianEmail') && formErrors.guardianEmail && (
                <div className="invalid-feedback">{formErrors.guardianEmail}</div>
              )}
            </div>
          </div>

          {/* Row 6: Address */}
          <div className="mb-3">
            <label htmlFor="address" className="form-label">Address</label>
            <input
              id="address"
              className={fieldClass('address')}
              name="address"
              value={form.address}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter address"
            />
            {touched.has('address') && formErrors.address && (
              <div className="invalid-feedback">{formErrors.address}</div>
            )}
          </div>

          {/* Row 7: City, State, Zip Code */}
          <div className="row mb-3">
            <div className="col-md-4">
              <label htmlFor="city" className="form-label">City</label>
              <input
                id="city"
                className={fieldClass('city')}
                name="city"
                value={form.city}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="City"
              />
              {touched.has('city') && formErrors.city && (
                <div className="invalid-feedback">{formErrors.city}</div>
              )}
            </div>
            <div className="col-md-4">
              <label htmlFor="state" className="form-label">State</label>
              <input
                id="state"
                className={fieldClass('state')}
                name="state"
                value={form.state}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="State"
              />
              {touched.has('state') && formErrors.state && (
                <div className="invalid-feedback">{formErrors.state}</div>
              )}
            </div>
            <div className="col-md-4">
              <label htmlFor="zipCode" className="form-label">Zip Code</label>
              <input
                id="zipCode"
                className={fieldClass('zipCode')}
                name="zipCode"
                value={form.zipCode}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Zip code"
              />
              {touched.has('zipCode') && formErrors.zipCode && (
                <div className="invalid-feedback">{formErrors.zipCode}</div>
              )}
            </div>
          </div>

          {/* Status (edit only) */}
          {editingStudent && (
            <div className="mb-3">
              <label htmlFor="status" className="form-label">Status</label>
              <select
                id="status"
                className="form-select"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as StudentStatus)}
              >
                {STUDENT_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}
        </form>
      </Modal>
    </div>
  )
}

export default Students
