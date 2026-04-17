import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from '../api/userApi.ts'
import { getBranches } from '../api/branchApi.ts'
import { getOrganizationById } from '../api/organizationApi.ts'
import { useAuth } from '../hooks/useAuth.ts'
import type {
  UserResponse,
  CreateUserRequest,
  UpdateUserRequest,
  UserStatus,
  UserFormData,
} from '../types/user.ts'
import type { UserRole } from '../types/auth.ts'
import type { BranchResponse } from '../types/branch.ts'
import {
  required,
  minLength,
  maxLength,
  email,
  composeValidators,
} from '../utils/validators.ts'
import type { ValidationSchema } from '../utils/validators.ts'
import { useFormValidation } from '../hooks/useFormValidation.ts'
import { useCanWrite } from '../hooks/useCanWrite.ts'
import { useToast } from '../hooks/useToast.ts'
import { WRITE_ROLES } from '../config/roles.ts'
import StatusBadge from '../components/StatusBadge.tsx'
import SortableHeader from '../components/SortableHeader.tsx'
import Pagination from '../components/Pagination.tsx'
import Toast from '../components/Toast.tsx'
import ConfirmModal from '../components/ConfirmModal.tsx'
import Modal from '../components/Modal.tsx'
import LoadingSpinner from '../components/LoadingSpinner.tsx'
import EmptyState from '../components/EmptyState.tsx'

const EMPTY_FORM: UserFormData = {
  fullName: '',
  email: '',
  password: '',
  role: '',
  branchId: '',
  department: '',
}

const ROLE_BADGE_CLASSES: Record<UserRole, string> = {
  SUPER_ADMIN: 'bg-danger',
  ORG_ADMIN: 'bg-primary',
  ADMIN: 'bg-info',
  USER: 'bg-secondary',
}

function RoleBadge({ role }: { role: UserRole }) {
  const cls = ROLE_BADGE_CLASSES[role] || 'bg-secondary'
  return <span className={`badge ${cls}`}>{role}</span>
}

const createSchema: ValidationSchema<UserFormData> = {
  fullName: composeValidators(required('Full name'), minLength(2), maxLength(100)),
  email: composeValidators(required('Email'), email()),
  password: composeValidators(required('Password'), minLength(8)),
  role: required('Role'),
  branchId: () => undefined,
  department: maxLength(100),
}

const editSchema: ValidationSchema<UserFormData> = {
  fullName: composeValidators(required('Full name'), minLength(2), maxLength(100)),
  email: composeValidators(required('Email'), email()),
  password: (value: string) => {
    if (!value) return undefined
    if (value.length < 8) return 'Must be at least 8 characters'
    return undefined
  },
  role: required('Role'),
  branchId: () => undefined,
  department: maxLength(100),
}

function Users() {
  const { organizationId } = useParams<{ organizationId: string }>()
  const navigate = useNavigate()
  const canWrite = useCanWrite(WRITE_ROLES.users)
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const { toast, showSuccess, showError, dismiss } = useToast()

  const [orgName, setOrgName] = useState('')
  const [userList, setUserList] = useState<UserResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [sort, setSort] = useState('fullName,asc')

  // Filter state
  const [filterBranchId, setFilterBranchId] = useState('')
  const [filterBranches, setFilterBranches] = useState<BranchResponse[]>([])

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<UserResponse | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null)
  const [form, setForm] = useState<UserFormData>(EMPTY_FORM)
  const [editStatus, setEditStatus] = useState<UserStatus>('ACTIVE')
  const [submitting, setSubmitting] = useState(false)
  const [isCreateMode, setIsCreateMode] = useState(true)

  // Modal branch list
  const [modalBranches, setModalBranches] = useState<BranchResponse[]>([])

  // Build validation schema dynamically based on create vs edit mode
  const activeSchema = isCreateMode ? createSchema : editSchema

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

  // Fetch branches for filter bar
  useEffect(() => {
    if (!organizationId) return
    getBranches(organizationId, 0, 100)
      .then((data) => setFilterBranches(data.content))
      .catch(() => setFilterBranches([]))
  }, [organizationId])

  const fetchUsers = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)
    setError('')
    try {
      const data = await getUsers(
        organizationId,
        page,
        10,
        filterBranchId || undefined,
        sort,
      )
      setUserList(data.content)
      setTotalPages(data.page.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [organizationId, page, filterBranchId, sort])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  useEffect(() => { setPage(0) }, [sort])

  // Filter handlers
  const handleFilterBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterBranchId(e.target.value)
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

  // Branch lookup map for table display
  const branchNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const b of filterBranches) {
      map.set(b.id, b.name)
    }
    return map
  }, [filterBranches])

  const openCreateModal = () => {
    setIsCreateMode(true)
    setEditingUser(null)
    setForm(EMPTY_FORM)
    resetValidation()
    fetchModalBranches()
    setShowModal(true)
  }

  const openEditModal = (user: UserResponse) => {
    setIsCreateMode(false)
    setEditingUser(user)
    setForm({
      fullName: user.fullName,
      email: user.email,
      password: '',
      role: user.role,
      branchId: user.branchId,
      department: user.department,
    })
    setEditStatus(user.status)
    resetValidation()
    fetchModalBranches()
    setShowModal(true)
  }

  const closeModal = useCallback(() => {
    setShowModal(false)
    setEditingUser(null)
    setForm(EMPTY_FORM)
    resetValidation()
  }, [resetValidation])


  const handleDelete = async () => {
    if (!deleteTarget || !organizationId) return
    setDeleting(true)
    try {
      await deleteUser(organizationId, deleteTarget.id)
      showSuccess(`"${deleteTarget.fullName}" deleted successfully`)
      setDeleteTarget(null)
      fetchUsers()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setDeleting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    revalidateField(name as keyof UserFormData, value)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    touchAndValidateField(name as keyof UserFormData, value)
  }

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    revalidateField(name as keyof UserFormData, value)
  }

  const handleSelectBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
    const { name, value } = e.target
    touchAndValidateField(name as keyof UserFormData, value)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!organizationId) return

    const validationErrors = validateAll(form)
    if (Object.keys(validationErrors).length > 0) return

    setSubmitting(true)
    setError('')
    try {
      if (editingUser) {
        const updateData: UpdateUserRequest = {
          fullName: form.fullName,
          email: form.email,
          role: form.role as UserRole,
          branchId: form.branchId,
          department: form.department,
          status: editStatus,
        }
        if (form.password.trim()) {
          updateData.password = form.password
        }
        await updateUser(organizationId, editingUser.id, updateData)
        showSuccess('User updated successfully')
      } else {
        const createData: CreateUserRequest = {
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          role: form.role as UserRole,
          branchId: form.branchId,
          department: form.department,
        }
        await createUser(organizationId, createData)
        showSuccess('User created successfully')
      }
      closeModal()
      fetchUsers()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save user')
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
          <h1 className="page-title">Users</h1>
          {orgName && <p className="text-muted mb-0">{orgName}</p>}
        </div>
        {canWrite && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            + New User
          </button>
        )}
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
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <LoadingSpinner />
      ) : userList.length === 0 ? (
        <EmptyState message="No users found." />
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-hover align-middle app-table">
              <thead>
                <tr>
                  <SortableHeader label="Full Name" field="fullName" currentSort={sort} onSort={setSort} />
                  <SortableHeader label="Email" field="email" currentSort={sort} onSort={setSort} />
                  <SortableHeader label="Role" field="role" currentSort={sort} onSort={setSort} />
                  <th>Branch</th>
                  <th>Department</th>
                  <SortableHeader label="Status" field="status" currentSort={sort} onSort={setSort} />
                  {canWrite && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {userList.map((user) => (
                  <tr key={user.id}>
                    <td className="fw-semibold">{user.fullName}</td>
                    <td>{user.email}</td>
                    <td><RoleBadge role={user.role} /></td>
                    <td>{branchNameMap.get(user.branchId) || user.branchId}</td>
                    <td>{user.department}</td>
                    <td><StatusBadge status={user.status} /></td>
                    {canWrite && (
                      <td>
                        <button
                          className="btn btn-sm btn-outline-primary me-2"
                          onClick={() => openEditModal(user)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setDeleteTarget(user)}
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

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        message={`Are you sure you want to delete ${deleteTarget ? deleteTarget.fullName : ''}?`}
        detail="This action cannot be undone."
        loading={deleting}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingUser ? 'Edit User' : 'New User'}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" form="user-form" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingUser ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <form id="user-form" onSubmit={handleSubmit} noValidate>
          {/* Row 1: Full Name */}
          <div className="mb-3">
            <label htmlFor="fullName" className="form-label">Full Name <span className="text-danger">*</span></label>
            <input
              id="fullName"
              className={fieldClass('fullName')}
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter full name"
            />
            {touched.has('fullName') && formErrors.fullName && (
              <div className="invalid-feedback">{formErrors.fullName}</div>
            )}
          </div>

          {/* Row 2: Email */}
          <div className="mb-3">
            <label htmlFor="email" className="form-label">Email <span className="text-danger">*</span></label>
            <input
              id="email"
              className={fieldClass('email')}
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. user@school.edu"
            />
            {touched.has('email') && formErrors.email && (
              <div className="invalid-feedback">{formErrors.email}</div>
            )}
          </div>

          {/* Row 3: Password */}
          <div className="mb-3">
            <label htmlFor="password" className="form-label">
              Password {!editingUser && <span className="text-danger">*</span>}
            </label>
            <input
              id="password"
              className={fieldClass('password')}
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder={editingUser ? 'Leave blank to keep current password' : 'Enter password'}
            />
            {touched.has('password') && formErrors.password && (
              <div className="invalid-feedback">{formErrors.password}</div>
            )}
          </div>

          {/* Row 4: Role */}
          <div className="mb-3">
            <label htmlFor="role" className="form-label">Role <span className="text-danger">*</span></label>
            <select
              id="role"
              className={fieldClass('role', 'form-select')}
              name="role"
              value={form.role}
              onChange={handleSelectChange}
              onBlur={handleSelectBlur}
            >
              <option value="">Select Role</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="ORG_ADMIN">Org Admin</option>
              <option value="ADMIN">Admin</option>
              <option value="USER">User</option>
            </select>
            {touched.has('role') && formErrors.role && (
              <div className="invalid-feedback">{formErrors.role}</div>
            )}
          </div>

          {/* Row 5: Branch & Department */}
          <div className="row mb-3">
            <div className="col-md-6">
              <label htmlFor="branchId" className="form-label">Branch</label>
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
          </div>

          {/* Status (edit only) */}
          {editingUser && (
            <div className="mb-3">
              <label htmlFor="status" className="form-label">Status</label>
              <select
                id="status"
                className="form-select"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as UserStatus)}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="LOCKED">Locked</option>
              </select>
            </div>
          )}
        </form>
      </Modal>
    </div>
  )
}

export default Users
