import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization,
} from '../api/organizationApi.ts'
import type {
  OrganizationResponse,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  OrganizationStatus,
} from '../types/organization.ts'
import {
  required,
  minLength,
  maxLength,
  email,
  phone,
  url,
  composeValidators,
} from '../utils/validators.ts'
import type { ValidationSchema } from '../utils/validators.ts'
import { useFormValidation } from '../hooks/useFormValidation.ts'
import { useCanWrite } from '../hooks/useCanWrite.ts'
import { useToast } from '../hooks/useToast.ts'
import { WRITE_ROLES } from '../config/roles.ts'
import { ORGANIZATION_STATUS_OPTIONS } from '../constants/statuses.ts'
import StatusBadge from '../components/StatusBadge.tsx'
import SortableHeader from '../components/SortableHeader.tsx'
import Pagination from '../components/Pagination.tsx'
import Toast from '../components/Toast.tsx'
import ConfirmModal from '../components/ConfirmModal.tsx'
import Modal from '../components/Modal.tsx'

const EMPTY_FORM: CreateOrganizationRequest = {
  name: '',
  address: '',
  contactEmail: '',
  contactPhone: '',
  website: '',
  logoUrl: '',
}

const orgSchema: ValidationSchema<CreateOrganizationRequest> = {
  name: composeValidators(required('Organization name'), minLength(2), maxLength(100)),
  address: maxLength(255),
  contactEmail: email(),
  contactPhone: phone(),
  website: url(),
  logoUrl: url(),
}

function Organizations() {
  const navigate = useNavigate()
  const canWrite = useCanWrite(WRITE_ROLES.organizations)
  const { toast, showSuccess, showError, dismiss } = useToast()
  const [organizations, setOrganizations] = useState<OrganizationResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [sort, setSort] = useState('name,asc')

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<OrganizationResponse | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingOrg, setEditingOrg] = useState<OrganizationResponse | null>(null)
  const [form, setForm] = useState<CreateOrganizationRequest>(EMPTY_FORM)
  const [editStatus, setEditStatus] = useState<OrganizationStatus>('ACTIVE')
  const [submitting, setSubmitting] = useState(false)

  const {
    errors: formErrors,
    touched,
    validateAll,
    touchAndValidateField,
    revalidateField,
    fieldClass,
    reset: resetValidation,
  } = useFormValidation(orgSchema)

  const fetchOrganizations = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getOrganizations(page, 10, sort)
      setOrganizations(data.content)
      setTotalPages(data.page.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organizations')
    } finally {
      setLoading(false)
    }
  }, [page, sort])

  useEffect(() => {
    fetchOrganizations()
  }, [fetchOrganizations])

  useEffect(() => { setPage(0) }, [sort])

  const openCreateModal = () => {
    setEditingOrg(null)
    setForm(EMPTY_FORM)
    resetValidation()
    setShowModal(true)
  }

  const openEditModal = (org: OrganizationResponse) => {
    setEditingOrg(org)
    setForm({
      name: org.name,
      address: org.address,
      contactEmail: org.contactEmail,
      contactPhone: org.contactPhone,
      website: org.website,
      logoUrl: org.logoUrl,
    })
    setEditStatus(org.status)
    resetValidation()
    setShowModal(true)
  }

  const closeModal = useCallback(() => {
    setShowModal(false)
    setEditingOrg(null)
    setForm(EMPTY_FORM)
    resetValidation()
  }, [resetValidation])


  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteOrganization(deleteTarget.id)
      showSuccess(`"${deleteTarget.name}" deleted successfully`)
      setDeleteTarget(null)
      fetchOrganizations()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete organization')
    } finally {
      setDeleting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    revalidateField(name as keyof CreateOrganizationRequest, value)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    touchAndValidateField(name as keyof CreateOrganizationRequest, value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationErrors = validateAll(form)
    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setSubmitting(true)
    setError('')
    try {
      if (editingOrg) {
        const updateData: UpdateOrganizationRequest = { ...form, status: editStatus }
        await updateOrganization(editingOrg.id, updateData)
        showSuccess('Organization updated successfully')
      } else {
        await createOrganization(form)
        showSuccess('Organization created successfully')
      }
      closeModal()
      fetchOrganizations()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save organization')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-container">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={dismiss} />
      )}

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="page-title">Organizations</h1>
        {canWrite && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            + New Organization
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : organizations.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <p>No organizations found.</p>
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-hover align-middle app-table">
              <thead>
                <tr>
                  <th>ARK ID</th>
                  <SortableHeader label="Name" field="name" currentSort={sort} onSort={setSort} />
                  <SortableHeader label="Email" field="contactEmail" currentSort={sort} onSort={setSort} />
                  <th>Phone</th>
                  <SortableHeader label="Status" field="status" currentSort={sort} onSort={setSort} />
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => (
                  <tr key={org.id}>
                    <td><code>{org.arkId}</code></td>
                    <td className="fw-semibold">{org.name}</td>
                    <td>{org.contactEmail}</td>
                    <td>{org.contactPhone}</td>
                    <td><StatusBadge status={org.status} /></td>
                    <td>
                      {canWrite && (
                        <button
                          className="btn btn-sm btn-outline-primary me-2"
                          onClick={() => openEditModal(org)}
                        >
                          Edit
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-outline-secondary me-2"
                        onClick={() => navigate(`/organizations/${org.id}/branches`)}
                      >
                        Branches
                      </button>
                      <button
                        className="btn btn-sm btn-outline-secondary me-2"
                        onClick={() => navigate(`/organizations/${org.id}/students`)}
                      >
                        Students
                      </button>
                      <button
                        className="btn btn-sm btn-outline-secondary me-2"
                        onClick={() => navigate(`/organizations/${org.id}/faculty`)}
                      >
                        Faculty
                      </button>
                      <button
                        className="btn btn-sm btn-outline-secondary me-2"
                        onClick={() => navigate(`/organizations/${org.id}/users`)}
                      >
                        Users
                      </button>
                      {canWrite && (
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setDeleteTarget(org)}
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
        detail="This action cannot be undone. All branches under this organization will also be removed."
        loading={deleting}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingOrg ? 'Edit Organization' : 'New Organization'}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" form="org-form" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingOrg ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <form id="org-form" onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="name" className="form-label">Name <span className="text-danger">*</span></label>
            <input
              id="name"
              className={fieldClass('name')}
              name="name"
              value={form.name}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter organization name"
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
                placeholder="e.g. admin@school.edu"
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
          <div className="row mb-3">
            <div className="col-md-6">
              <label htmlFor="website" className="form-label">Website</label>
              <input
                id="website"
                className={fieldClass('website')}
                name="website"
                value={form.website}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="https://www.example.com"
              />
              {touched.has('website') && formErrors.website && (
                <div className="invalid-feedback">{formErrors.website}</div>
              )}
            </div>
            <div className="col-md-6">
              <label htmlFor="logoUrl" className="form-label">Logo URL</label>
              <input
                id="logoUrl"
                className={fieldClass('logoUrl')}
                name="logoUrl"
                value={form.logoUrl}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="https://www.example.com/logo.png"
              />
              {touched.has('logoUrl') && formErrors.logoUrl && (
                <div className="invalid-feedback">{formErrors.logoUrl}</div>
              )}
            </div>
          </div>
          {editingOrg && (
            <div className="mb-3">
              <label htmlFor="status" className="form-label">Status</label>
              <select
                id="status"
                className="form-select"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as OrganizationStatus)}
              >
                {ORGANIZATION_STATUS_OPTIONS.map((opt) => (
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

export default Organizations
