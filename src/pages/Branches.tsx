import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
} from '../api/branchApi.ts'
import { importBranches } from '../api/bulkImportApi.ts'
import BulkImportModal from '../components/BulkImportModal.tsx'
import { getOrganizationById } from '../api/organizationApi.ts'
import { useAuth } from '../hooks/useAuth.ts'
import type {
  BranchResponse,
  CreateBranchRequest,
  UpdateBranchRequest,
  BranchStatus,
} from '../types/branch.ts'
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
import { useToast } from '../hooks/useToast.ts'
import { BRANCH_STATUS_OPTIONS } from '../constants/statuses.ts'
import StatusBadge from '../components/StatusBadge.tsx'
import SortableHeader from '../components/SortableHeader.tsx'
import Pagination from '../components/Pagination.tsx'
import Toast from '../components/Toast.tsx'
import ConfirmModal from '../components/ConfirmModal.tsx'
import Modal from '../components/Modal.tsx'

const EMPTY_FORM: CreateBranchRequest = {
  name: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  contactEmail: '',
  contactPhone: '',
}

const branchSchema: ValidationSchema<CreateBranchRequest> = {
  name: composeValidators(required('Branch name'), minLength(2), maxLength(100)),
  address: maxLength(255),
  city: maxLength(100),
  state: maxLength(100),
  zipCode: pattern(/^[\w\s-]{3,10}$/, 'Enter a valid zip/postal code'),
  contactEmail: email(),
  contactPhone: phone(),
}

function Branches() {
  const { organizationId } = useParams<{ organizationId: string }>()
  const navigate = useNavigate()
  const canWrite = useCanWrite(WRITE_ROLES.branches)
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const { toast, showSuccess, showError, dismiss } = useToast()

  const [orgName, setOrgName] = useState('')
  const [branches, setBranches] = useState<BranchResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [sort, setSort] = useState('name,asc')

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<BranchResponse | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [showImportModal, setShowImportModal] = useState(false)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingBranch, setEditingBranch] = useState<BranchResponse | null>(null)
  const [form, setForm] = useState<CreateBranchRequest>(EMPTY_FORM)
  const [editStatus, setEditStatus] = useState<BranchStatus>('ACTIVE')
  const [submitting, setSubmitting] = useState(false)

  const {
    errors: formErrors,
    touched,
    validateAll,
    touchAndValidateField,
    revalidateField,
    fieldClass,
    reset: resetValidation,
  } = useFormValidation(branchSchema)

  useEffect(() => {
    if (!organizationId) return
    getOrganizationById(organizationId)
      .then((org) => setOrgName(org.name))
      .catch(() => setOrgName('Unknown Organization'))
  }, [organizationId])

  const fetchBranches = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)
    setError('')
    try {
      const data = await getBranches(organizationId, page, 10, sort)
      setBranches(data.content)
      setTotalPages(data.page.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load branches')
    } finally {
      setLoading(false)
    }
  }, [organizationId, page, sort])

  useEffect(() => {
    fetchBranches()
  }, [fetchBranches])

  useEffect(() => { setPage(0) }, [sort])

  const openCreateModal = () => {
    setEditingBranch(null)
    setForm(EMPTY_FORM)
    resetValidation()
    setShowModal(true)
  }

  const openEditModal = (branch: BranchResponse) => {
    setEditingBranch(branch)
    setForm({
      name: branch.name,
      address: branch.address,
      city: branch.city,
      state: branch.state,
      zipCode: branch.zipCode,
      contactEmail: branch.contactEmail,
      contactPhone: branch.contactPhone,
    })
    setEditStatus(branch.status)
    resetValidation()
    setShowModal(true)
  }

  const closeModal = useCallback(() => {
    setShowModal(false)
    setEditingBranch(null)
    setForm(EMPTY_FORM)
    resetValidation()
  }, [resetValidation])


  const handleDelete = async () => {
    if (!deleteTarget || !organizationId) return
    setDeleting(true)
    try {
      await deleteBranch(organizationId, deleteTarget.id)
      showSuccess(`"${deleteTarget.name}" deleted successfully`)
      setDeleteTarget(null)
      fetchBranches()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete branch')
    } finally {
      setDeleting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    revalidateField(name as keyof CreateBranchRequest, value)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    touchAndValidateField(name as keyof CreateBranchRequest, value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organizationId) return

    const validationErrors = validateAll(form)
    if (Object.keys(validationErrors).length > 0) return

    setSubmitting(true)
    setError('')
    try {
      if (editingBranch) {
        const updateData: UpdateBranchRequest = { ...form, status: editStatus }
        await updateBranch(organizationId, editingBranch.id, updateData)
        showSuccess('Branch updated successfully')
      } else {
        await createBranch(organizationId, form)
        showSuccess('Branch created successfully')
      }
      closeModal()
      fetchBranches()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save branch')
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
          <h1 className="page-title">Branches</h1>
          {orgName && <p className="text-muted mb-0">{orgName}</p>}
        </div>
        {canWrite && (
          <div className="d-flex gap-2">
            <button className="btn btn-outline-primary" onClick={() => setShowImportModal(true)}>
              Import CSV
            </button>
            <button className="btn btn-primary" onClick={openCreateModal}>
              + New Branch
            </button>
          </div>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : branches.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <p>No branches found for this organization.</p>
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-hover align-middle app-table">
              <thead>
                <tr>
                  <th>ARK ID</th>
                  <SortableHeader label="Name" field="name" currentSort={sort} onSort={setSort} />
                  <SortableHeader label="City" field="city" currentSort={sort} onSort={setSort} />
                  <SortableHeader label="State" field="state" currentSort={sort} onSort={setSort} />
                  <th>Email</th>
                  <th>Phone</th>
                  <SortableHeader label="Status" field="status" currentSort={sort} onSort={setSort} />
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((branch) => (
                  <tr key={branch.id}>
                    <td><code>{branch.arkId}</code></td>
                    <td className="fw-semibold">{branch.name}</td>
                    <td>{branch.city}</td>
                    <td>{branch.state}</td>
                    <td>{branch.contactEmail}</td>
                    <td>{branch.contactPhone}</td>
                    <td><StatusBadge status={branch.status} /></td>
                    <td>
                      {canWrite && (
                        <button
                          className="btn btn-sm btn-outline-primary me-2"
                          onClick={() => openEditModal(branch)}
                        >
                          Edit
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-outline-secondary me-2"
                        onClick={() => navigate(`/organizations/${organizationId}/branches/${branch.id}/classes`)}
                      >
                        Classes
                      </button>
                      <button
                        className="btn btn-sm btn-outline-info me-2"
                        onClick={() => navigate(`/organizations/${organizationId}/branches/${branch.id}/students`)}
                      >
                        Students
                      </button>
                      <button
                        className="btn btn-sm btn-outline-success me-2"
                        onClick={() => navigate(`/organizations/${organizationId}/faculty?branchId=${branch.id}`)}
                      >
                        Faculty
                      </button>
                      <button
                        className="btn btn-sm btn-outline-secondary me-2"
                        onClick={() => navigate(`/organizations/${organizationId}/branches/${branch.id}/examinations`)}
                      >
                        Exams
                      </button>
                      {canWrite && (
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setDeleteTarget(branch)}
                        >
                          Delete
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        detail="This action cannot be undone."
        loading={deleting}
      />

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Branches"
        entityType="branches"
        organizationId={organizationId!}
        onImport={(file) => importBranches(organizationId!, file)}
        onComplete={fetchBranches}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingBranch ? 'Edit Branch' : 'New Branch'}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" form="branch-form" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingBranch ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <form id="branch-form" onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="name" className="form-label">Name <span className="text-danger">*</span></label>
            <input
              id="name"
              className={fieldClass('name')}
              name="name"
              value={form.name}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter branch name"
            />
            {touched.has('name') && formErrors.name && (
              <div className="invalid-feedback">{formErrors.name}</div>
            )}
          </div>
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
          <div className="row mb-3">
            <div className="col-md-6">
              <label htmlFor="contactEmail" className="form-label">Email</label>
              <input
                id="contactEmail"
                className={fieldClass('contactEmail')}
                name="contactEmail"
                type="email"
                value={form.contactEmail}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g. branch@school.edu"
              />
              {touched.has('contactEmail') && formErrors.contactEmail && (
                <div className="invalid-feedback">{formErrors.contactEmail}</div>
              )}
            </div>
            <div className="col-md-6">
              <label htmlFor="contactPhone" className="form-label">Phone</label>
              <input
                id="contactPhone"
                className={fieldClass('contactPhone')}
                name="contactPhone"
                value={form.contactPhone}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g. +1 (555) 123-4567"
              />
              {touched.has('contactPhone') && formErrors.contactPhone && (
                <div className="invalid-feedback">{formErrors.contactPhone}</div>
              )}
            </div>
          </div>
          {editingBranch && (
            <div className="mb-3">
              <label htmlFor="status" className="form-label">Status</label>
              <select
                id="status"
                className="form-select"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as BranchStatus)}
              >
                {BRANCH_STATUS_OPTIONS.map((opt) => (
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

export default Branches
