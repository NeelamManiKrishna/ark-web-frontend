import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  getFaculty,
  createFaculty,
  updateFaculty,
  deleteFaculty,
} from '../api/facultyApi.ts'
import { importFaculty } from '../api/bulkImportApi.ts'
import BulkImportModal from '../components/BulkImportModal.tsx'
import { getBranches } from '../api/branchApi.ts'
import { getOrganizationById } from '../api/organizationApi.ts'
import { useAuth } from '../hooks/useAuth.ts'
import { useToast } from '../hooks/useToast.ts'
import { useAdminBranchScope } from '../hooks/useAdminBranchScope.ts'
import { useDebounce } from '../hooks/useDebounce.ts'
import type {
  FacultyResponse,
  CreateFacultyRequest,
  UpdateFacultyRequest,
  FacultyStatus,
  FacultyFormData,
} from '../types/faculty.ts'
import type { BranchResponse } from '../types/branch.ts'
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
import { FACULTY_STATUS_OPTIONS, GENDER_OPTIONS, GOVT_ID_TYPE_OPTIONS } from '../constants/statuses.ts'
import StatusBadge from '../components/StatusBadge.tsx'
import SortableHeader from '../components/SortableHeader.tsx'
import Pagination from '../components/Pagination.tsx'
import Toast from '../components/Toast.tsx'
import ConfirmModal from '../components/ConfirmModal.tsx'
import Modal from '../components/Modal.tsx'

const EMPTY_FORM: FacultyFormData = {
  branchId: '',
  employeeId: '',
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
  department: '',
  designation: '',
  qualifications: '',
  specializations: '',
  joiningDate: '',
}

const baseFacultySchema: ValidationSchema<FacultyFormData> = {
  branchId: required('Branch'),
  employeeId: composeValidators(maxLength(50)),
  firstName: composeValidators(required('First name'), minLength(2), maxLength(50)),
  lastName: composeValidators(required('Last name'), minLength(2), maxLength(50)),
  email: email(),
  phone: phone(),
  dateOfBirth: () => undefined,
  gender: () => undefined,
  govtIdType: required('Govt ID type'),
  govtIdNumber: composeValidators(required('Govt ID number'), maxLength(50)),
  joiningDate: () => undefined,
  department: maxLength(100),
  designation: maxLength(100),
  qualifications: () => undefined,
  specializations: () => undefined,
  address: maxLength(255),
  city: maxLength(100),
  state: maxLength(100),
  zipCode: pattern(/^[\w\s-]{3,10}$/, 'Enter a valid zip/postal code'),
}

const editFacultySchema: ValidationSchema<FacultyFormData> = {
  ...baseFacultySchema,
  govtIdType: () => undefined, // optional on update
  govtIdNumber: maxLength(50), // optional on update
}

function parseCommaSeparated(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

function Faculty() {
  const { organizationId } = useParams<{ organizationId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const canWrite = useCanWrite(WRITE_ROLES.faculty)
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'

  const { toast, showSuccess, showError, dismiss } = useToast()
  const { adminBranchId, branchLocked } = useAdminBranchScope(organizationId)

  const [orgName, setOrgName] = useState('')
  const [facultyList, setFacultyList] = useState<FacultyResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const [sort, setSort] = useState('firstName,asc')

  // Filter state — initialize from URL query param if present
  const [filterBranchId, setFilterBranchId] = useState(searchParams.get('branchId') ?? '')
  const [filterDepartment, setFilterDepartment] = useState('')
  const [filterBranches, setFilterBranches] = useState<BranchResponse[]>([])

  const debouncedDepartment = useDebounce(filterDepartment)

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<FacultyResponse | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [showImportModal, setShowImportModal] = useState(false)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingFaculty, setEditingFaculty] = useState<FacultyResponse | null>(null)
  const [form, setForm] = useState<FacultyFormData>(EMPTY_FORM)
  const [editStatus, setEditStatus] = useState<FacultyStatus>('ACTIVE')
  const [submitting, setSubmitting] = useState(false)

  // Modal branch list
  const [modalBranches, setModalBranches] = useState<BranchResponse[]>([])

  const activeSchema = editingFaculty ? editFacultySchema : baseFacultySchema

  const {
    errors: formErrors,
    touched,
    validateAll,
    touchAndValidateField,
    revalidateField,
    fieldClass,
    reset: resetValidation,
  } = useFormValidation(activeSchema)

  // Set filter branch when admin branch scope resolves
  useEffect(() => {
    if (adminBranchId) setFilterBranchId(adminBranchId)
  }, [adminBranchId])

  // Fetch org name
  useEffect(() => {
    if (!organizationId) return
    getOrganizationById(organizationId)
      .then((org) => setOrgName(org.name))
      .catch(() => setOrgName('Unknown Organization'))
  }, [organizationId])

  // Fetch branches for filter bar
  useEffect(() => {
    if (!organizationId) return
    getBranches(organizationId, 0, 100)
      .then((data) => setFilterBranches(data.content))
      .catch(() => setFilterBranches([]))
  }, [organizationId])

  const fetchFaculty = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)
    setError('')
    try {
      const data = await getFaculty(
        organizationId,
        page,
        10,
        filterBranchId || undefined,
        debouncedDepartment || undefined,
        sort,
      )
      setFacultyList(data.content)
      setTotalPages(data.page.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load faculty')
    } finally {
      setLoading(false)
    }
  }, [organizationId, page, filterBranchId, debouncedDepartment, sort])

  useEffect(() => {
    fetchFaculty()
  }, [fetchFaculty])

  useEffect(() => { setPage(0) }, [sort])

  // Filter handlers
  const handleFilterBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterBranchId(e.target.value)
    setPage(0)
  }

  const handleFilterDepartmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterDepartment(e.target.value)
    setPage(0)
  }

  // Fetch branches for modal
  const fetchModalBranches = useCallback(async () => {
    if (!organizationId) return
    try {
      const data = await getBranches(organizationId, 0, 100)
      setModalBranches(data.content)
    } catch {
      setModalBranches([])
    }
  }, [organizationId])

  const openCreateModal = () => {
    setEditingFaculty(null)
    setForm(EMPTY_FORM)
    resetValidation()
    fetchModalBranches()
    setShowModal(true)
  }

  const openEditModal = (faculty: FacultyResponse) => {
    setEditingFaculty(faculty)
    setForm({
      branchId: faculty.branchId,
      employeeId: faculty.employeeId ?? '',
      firstName: faculty.firstName,
      lastName: faculty.lastName,
      email: faculty.email,
      phone: faculty.phone,
      dateOfBirth: faculty.dateOfBirth,
      gender: faculty.gender,
      govtIdType: faculty.govtIdType ?? '',
      govtIdNumber: faculty.govtIdNumber ?? '',
      address: faculty.address,
      city: faculty.city,
      state: faculty.state,
      zipCode: faculty.zipCode,
      department: faculty.department,
      designation: faculty.designation,
      qualifications: faculty.qualifications.join(', '),
      specializations: faculty.specializations.join(', '),
      joiningDate: faculty.joiningDate,
    })
    setEditStatus(faculty.status)
    resetValidation()
    fetchModalBranches()
    setShowModal(true)
  }

  const closeModal = useCallback(() => {
    setShowModal(false)
    setEditingFaculty(null)
    setForm(EMPTY_FORM)
    resetValidation()
  }, [resetValidation])


  const handleDelete = async () => {
    if (!deleteTarget || !organizationId) return
    setDeleting(true)
    try {
      await deleteFaculty(organizationId, deleteTarget.id)
      showSuccess(`"${deleteTarget.firstName} ${deleteTarget.lastName}" deleted successfully`)
      setDeleteTarget(null)
      fetchFaculty()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete faculty')
    } finally {
      setDeleting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    revalidateField(name as keyof FacultyFormData, value)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    touchAndValidateField(name as keyof FacultyFormData, value)
  }

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    revalidateField(name as keyof FacultyFormData, value)
  }

  const handleSelectBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
    const { name, value } = e.target
    touchAndValidateField(name as keyof FacultyFormData, value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organizationId) return

    const validationErrors = validateAll(form)
    if (Object.keys(validationErrors).length > 0) return

    setSubmitting(true)
    setError('')
    try {
      if (editingFaculty) {
        const updateData: UpdateFacultyRequest = {
          branchId: form.branchId,
          employeeId: form.employeeId,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          govtIdType: form.govtIdType || undefined,
          govtIdNumber: form.govtIdNumber || undefined,
          address: form.address,
          city: form.city,
          state: form.state,
          zipCode: form.zipCode,
          department: form.department,
          designation: form.designation,
          qualifications: parseCommaSeparated(form.qualifications),
          specializations: parseCommaSeparated(form.specializations),
          joiningDate: form.joiningDate,
          status: editStatus,
        }
        await updateFaculty(organizationId, editingFaculty.id, updateData)
        showSuccess('Faculty updated successfully')
      } else {
        const createData: CreateFacultyRequest = {
          branchId: form.branchId,
          employeeId: form.employeeId,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          govtIdType: form.govtIdType,
          govtIdNumber: form.govtIdNumber,
          address: form.address,
          city: form.city,
          state: form.state,
          zipCode: form.zipCode,
          department: form.department,
          designation: form.designation,
          qualifications: parseCommaSeparated(form.qualifications),
          specializations: parseCommaSeparated(form.specializations),
          joiningDate: form.joiningDate,
        }
        await createFaculty(organizationId, createData)
        showSuccess('Faculty created successfully')
      }
      closeModal()
      fetchFaculty()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save faculty')
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
        <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate(isSuperAdmin ? '/organizations' : '/')}>
          &larr; {isSuperAdmin ? 'Back to Organizations' : 'Back to Dashboard'}
        </button>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title">Faculty</h1>
          {orgName && <p className="text-muted mb-0">{orgName}</p>}
        </div>
        {canWrite && (
          <div className="d-flex gap-2">
            <button className="btn btn-outline-primary" onClick={() => setShowImportModal(true)}>
              Import CSV
            </button>
            <button className="btn btn-primary" onClick={openCreateModal}>
              + New Faculty
            </button>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="row mb-3">
        <div className="col-md-3">
          <select
            className="form-select"
            value={filterBranchId}
            onChange={handleFilterBranchChange}
            disabled={branchLocked}
          >
            {!branchLocked && <option value="">All Branches</option>}
            {filterBranches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div className="col-md-3">
          <input
            className="form-control"
            type="text"
            placeholder="Filter by department"
            value={filterDepartment}
            onChange={handleFilterDepartmentChange}
          />
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : facultyList.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <p>No faculty found.</p>
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-hover align-middle app-table">
              <thead>
                <tr>
                  <th>ARK ID</th>
                  <SortableHeader label="Name" field="firstName" currentSort={sort} onSort={setSort} />
                  <SortableHeader label="Department" field="department" currentSort={sort} onSort={setSort} />
                  <SortableHeader label="Designation" field="designation" currentSort={sort} onSort={setSort} />
                  <th>Email</th>
                  <th>Phone</th>
                  <SortableHeader label="Status" field="status" currentSort={sort} onSort={setSort} />
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {facultyList.map((faculty) => (
                  <tr key={faculty.id}>
                    <td><code>{faculty.arkId}</code></td>
                    <td className="fw-semibold">{faculty.firstName} {faculty.lastName}</td>
                    <td>{faculty.department}</td>
                    <td>{faculty.designation}</td>
                    <td>{faculty.email}</td>
                    <td>{faculty.phone}</td>
                    <td><StatusBadge status={faculty.status} /></td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-info me-2"
                        onClick={() => navigate(`/organizations/${organizationId}/faculty/${faculty.id}/performance`)}
                      >
                        Performance
                      </button>
                      {canWrite && (
                        <>
                          <button
                            className="btn btn-sm btn-outline-primary me-2"
                            onClick={() => openEditModal(faculty)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => setDeleteTarget(faculty)}
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
        message={`Are you sure you want to delete ${deleteTarget ? `${deleteTarget.firstName} ${deleteTarget.lastName}` : ''}?`}
        detail="This action cannot be undone."
        loading={deleting}
      />

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Faculty"
        entityType="faculty"
        organizationId={organizationId!}
        onImport={(file) => importFaculty(organizationId!, file)}
        onComplete={fetchFaculty}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingFaculty ? 'Edit Faculty' : 'New Faculty'}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" form="faculty-form" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingFaculty ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <form id="faculty-form" onSubmit={handleSubmit} noValidate>
          {/* Row 1: Branch & Employee ID */}
          <div className="row mb-3">
            <div className="col-md-6">
              <label htmlFor="branchId" className="form-label">Branch <span className="text-danger">*</span></label>
              <select
                id="branchId"
                className={fieldClass('branchId', 'form-select')}
                name="branchId"
                value={form.branchId}
                onChange={handleSelectChange}
                onBlur={handleSelectBlur}
              >
                <option value="">Select Branch</option>
                {modalBranches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              {touched.has('branchId') && formErrors.branchId && (
                <div className="invalid-feedback">{formErrors.branchId}</div>
              )}
            </div>
            <div className="col-md-6">
              <label htmlFor="employeeId" className="form-label">Employee ID</label>
              <input
                id="employeeId"
                className={fieldClass('employeeId')}
                name="employeeId"
                value={form.employeeId}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g. EMP-001"
              />
              {touched.has('employeeId') && formErrors.employeeId && (
                <div className="invalid-feedback">{formErrors.employeeId}</div>
              )}
            </div>
          </div>

          {/* Row 2: First Name & Last Name */}
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

          {/* Row 3: Email & Phone */}
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
                placeholder="e.g. faculty@school.edu"
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

          {/* Row 4: Date of Birth, Gender, Joining Date */}
          <div className="row mb-3">
            <div className="col-md-4">
              <label htmlFor="dateOfBirth" className="form-label">Date of Birth</label>
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
              <label htmlFor="gender" className="form-label">Gender</label>
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
              <label htmlFor="joiningDate" className="form-label">Joining Date</label>
              <input
                id="joiningDate"
                className={fieldClass('joiningDate')}
                name="joiningDate"
                type="date"
                value={form.joiningDate}
                onChange={handleChange}
                onBlur={handleBlur}
              />
              {touched.has('joiningDate') && formErrors.joiningDate && (
                <div className="invalid-feedback">{formErrors.joiningDate}</div>
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
                value={form.govtIdType}
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
                value={form.govtIdNumber}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g. 1234-5678-9012"
              />
              {touched.has('govtIdNumber') && formErrors.govtIdNumber && (
                <div className="invalid-feedback">{formErrors.govtIdNumber}</div>
              )}
            </div>
          </div>

          {/* Row 6: Department & Designation */}
          <div className="row mb-3">
            <div className="col-md-6">
              <label htmlFor="department" className="form-label">Department</label>
              <input
                id="department"
                className={fieldClass('department')}
                name="department"
                value={form.department}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Enter department"
              />
              {touched.has('department') && formErrors.department && (
                <div className="invalid-feedback">{formErrors.department}</div>
              )}
            </div>
            <div className="col-md-6">
              <label htmlFor="designation" className="form-label">Designation</label>
              <input
                id="designation"
                className={fieldClass('designation')}
                name="designation"
                value={form.designation}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Enter designation"
              />
              {touched.has('designation') && formErrors.designation && (
                <div className="invalid-feedback">{formErrors.designation}</div>
              )}
            </div>
          </div>

          {/* Row 6: Qualifications & Specializations */}
          <div className="row mb-3">
            <div className="col-md-6">
              <label htmlFor="qualifications" className="form-label">Qualifications</label>
              <input
                id="qualifications"
                className={fieldClass('qualifications')}
                name="qualifications"
                value={form.qualifications}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g. PhD, M.Sc"
              />
              <small className="text-muted">Separate with commas</small>
              {touched.has('qualifications') && formErrors.qualifications && (
                <div className="invalid-feedback">{formErrors.qualifications}</div>
              )}
            </div>
            <div className="col-md-6">
              <label htmlFor="specializations" className="form-label">Specializations</label>
              <input
                id="specializations"
                className={fieldClass('specializations')}
                name="specializations"
                value={form.specializations}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g. AI, Machine Learning"
              />
              <small className="text-muted">Separate with commas</small>
              {touched.has('specializations') && formErrors.specializations && (
                <div className="invalid-feedback">{formErrors.specializations}</div>
              )}
            </div>
          </div>

          {/* Row 7: Address */}
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

          {/* Row 8: City, State, Zip Code */}
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
          {editingFaculty && (
            <div className="mb-3">
              <label htmlFor="status" className="form-label">Status</label>
              <select
                id="status"
                className="form-select"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as FacultyStatus)}
              >
                {FACULTY_STATUS_OPTIONS.map((opt) => (
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

export default Faculty
