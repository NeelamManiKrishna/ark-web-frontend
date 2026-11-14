import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useCanWrite } from '../hooks/useCanWrite.ts'
import { useToast } from '../hooks/useToast.ts'
import { WRITE_ROLES } from '../config/roles.ts'
import { getOrganizationById, updateOrganization } from '../api/organizationApi.ts'
import {
  getAcademicYears,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  getSubjects,
  createSubject,
  deleteSubject,
} from '../api/catalogApi.ts'
import { fieldErrorMap } from '../auth/apiError.ts'
import type { OrganizationResponse, UpdateOrganizationRequest } from '../types/organization.ts'
import type { AcademicYearResponse, SubjectResponse } from '../types/catalog.ts'
import ConfirmModal from '../components/ConfirmModal.tsx'
import LoadingSpinner from '../components/LoadingSpinner.tsx'
import Toast from '../components/Toast.tsx'
import { fetchAll } from '../api/paging.ts'

type Tab = 'organization' | 'years' | 'subjects'

const TABS: { id: Tab; label: string }[] = [
  { id: 'organization', label: 'Organization' },
  { id: 'years', label: 'Academic years' },
  { id: 'subjects', label: 'Subjects' },
]

function Settings() {
  const { organizationId } = useParams<{ organizationId: string }>()
  const canWrite = useCanWrite(WRITE_ROLES.settings)
  const { toast, showSuccess, showError, dismiss } = useToast()
  const [tab, setTab] = useState<Tab>('organization')

  if (!organizationId) return null

  return (
    <div className="page-container">
      <div className="mb-4">
        <h1 className="page-title">Settings</h1>
      </div>

      <ul className="nav nav-tabs mb-4" role="tablist">
        {TABS.map((t) => (
          <li className="nav-item" key={t.id} role="presentation">
            <button
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`nav-link${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          </li>
        ))}
      </ul>

      {tab === 'organization' && (
        <OrganizationTab organizationId={organizationId} canWrite={canWrite} onSaved={showSuccess} onError={showError} />
      )}
      {tab === 'years' && (
        <YearsTab organizationId={organizationId} canWrite={canWrite} onSaved={showSuccess} onError={showError} />
      )}
      {tab === 'subjects' && (
        <SubjectsTab organizationId={organizationId} canWrite={canWrite} onSaved={showSuccess} onError={showError} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={dismiss} />}
    </div>
  )
}

interface TabProps {
  organizationId: string
  canWrite: boolean
  onSaved: (msg: string) => void
  onError: (msg: string) => void
}

function OrganizationTab({ organizationId, canWrite, onSaved, onError }: TabProps) {
  const [org, setOrg] = useState<OrganizationResponse | null>(null)
  const [form, setForm] = useState<UpdateOrganizationRequest>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getOrganizationById(organizationId)
      .then((o) => {
        setOrg(o)
        setForm({
          name: o.name,
          address: o.address,
          contactEmail: o.contactEmail,
          contactPhone: o.contactPhone,
          website: o.website,
          logoUrl: o.logoUrl,
        })
      })
      .catch((err) => onError(err instanceof Error ? err.message : 'Failed to load organization'))
  }, [organizationId, onError])

  if (!org) return <LoadingSpinner />

  const fields: { key: keyof UpdateOrganizationRequest; label: string; type?: string }[] = [
    { key: 'name', label: 'Name' },
    { key: 'address', label: 'Address' },
    { key: 'contactEmail', label: 'Contact email', type: 'email' },
    { key: 'contactPhone', label: 'Contact phone' },
    { key: 'website', label: 'Website' },
    { key: 'logoUrl', label: 'Logo URL' },
  ]

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const updated = await updateOrganization(organizationId, form)
      setOrg(updated)
      onSaved('Organization updated')
    } catch (err) {
      setErrors(fieldErrorMap(err))
      onError(err instanceof Error ? err.message : 'Failed to update organization')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate style={{ maxWidth: 640 }}>
      {fields.map((f) => (
        <div className="mb-3" key={f.key}>
          <label className="form-label" htmlFor={`org-${f.key}`}>{f.label}</label>
          <input
            id={`org-${f.key}`}
            type={f.type ?? 'text'}
            className={`form-control${errors[f.key] ? ' is-invalid' : ''}`}
            value={(form[f.key] as string | undefined) ?? ''}
            disabled={!canWrite}
            onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
            aria-describedby={errors[f.key] ? `org-${f.key}-error` : undefined}
          />
          {errors[f.key] && <div id={`org-${f.key}-error`} className="invalid-feedback">{errors[f.key]}</div>}
        </div>
      ))}
      {canWrite && (
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      )}
    </form>
  )
}

function YearsTab({ organizationId, canWrite, onSaved, onError }: TabProps) {
  const [years, setYears] = useState<AcademicYearResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ label: '', startDate: '', endDate: '', current: false })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toDelete, setToDelete] = useState<AcademicYearResponse | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetchAll((p, s) => getAcademicYears(organizationId, p, s))
      .then((d) => setYears(d.content))
      .catch((err) => onError(err instanceof Error ? err.message : 'Failed to load academic years'))
      .finally(() => setLoading(false))
  }, [organizationId, onError])

  useEffect(load, [load])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setBusy(true)
    try {
      await createAcademicYear(organizationId, form)
      setForm({ label: '', startDate: '', endDate: '', current: false })
      onSaved('Academic year added')
      load()
    } catch (err) {
      setErrors(fieldErrorMap(err))
      onError(err instanceof Error ? err.message : 'Failed to add academic year')
    } finally {
      setBusy(false)
    }
  }

  const makeCurrent = async (y: AcademicYearResponse) => {
    try {
      await updateAcademicYear(organizationId, y.id, { current: true })
      onSaved(`${y.label} is now the current year`)
      load()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update academic year')
    }
  }

  const remove = async () => {
    if (!toDelete) return
    setBusy(true)
    try {
      await deleteAcademicYear(organizationId, toDelete.id)
      onSaved('Academic year deleted')
      setToDelete(null)
      load()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to delete academic year')
      setToDelete(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {canWrite && (
        <form className="row g-2 mb-4 align-items-end" onSubmit={add} noValidate>
          <div className="col-md-3">
            <label className="form-label small mb-1" htmlFor="ay-label">Label (e.g. 2025-2026)</label>
            <input id="ay-label" className={`form-control form-control-sm${errors.label ? ' is-invalid' : ''}`} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            {errors.label && <div className="invalid-feedback">{errors.label}</div>}
          </div>
          <div className="col-md-2">
            <label className="form-label small mb-1" htmlFor="ay-start">Start</label>
            <input id="ay-start" type="date" className="form-control form-control-sm" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </div>
          <div className="col-md-2">
            <label className="form-label small mb-1" htmlFor="ay-end">End</label>
            <input id="ay-end" type="date" className="form-control form-control-sm" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </div>
          <div className="col-md-2">
            <div className="form-check">
              <input id="ay-current" type="checkbox" className="form-check-input" checked={form.current} onChange={(e) => setForm({ ...form, current: e.target.checked })} />
              <label className="form-check-label small" htmlFor="ay-current">Current year</label>
            </div>
          </div>
          <div className="col-md-2">
            <button type="submit" className="btn btn-sm btn-primary" disabled={busy}>Add year</button>
          </div>
        </form>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : years.length === 0 ? (
        <p className="text-muted">No academic years yet.</p>
      ) : (
        <div className="table-responsive">
          <table className="table align-middle app-table">
            <caption className="visually-hidden">Academic years</caption>
            <thead>
              <tr>
                <th scope="col">Label</th>
                <th scope="col">Start</th>
                <th scope="col">End</th>
                <th scope="col">Status</th>
                {canWrite && <th scope="col">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {years.map((y) => (
                <tr key={y.id}>
                  <td className="fw-semibold">{y.label}</td>
                  <td>{y.startDate}</td>
                  <td>{y.endDate}</td>
                  <td>{y.current ? <span className="badge bg-success">Current</span> : ''}</td>
                  {canWrite && (
                    <td className="text-nowrap">
                      {!y.current && (
                        <button className="btn btn-sm btn-outline-primary me-2" onClick={() => makeCurrent(y)}>Make current</button>
                      )}
                      <button className="btn btn-sm btn-outline-danger" onClick={() => setToDelete(y)}>Delete</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        message={`Delete academic year ${toDelete?.label ?? ''}?`}
        detail="Years that classes still use cannot be deleted."
        loading={busy}
        loadingLabel="Deleting..."
      />
    </>
  )
}

function SubjectsTab({ organizationId, canWrite, onSaved, onError }: TabProps) {
  const [subjects, setSubjects] = useState<SubjectResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ code: '', name: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toDelete, setToDelete] = useState<SubjectResponse | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetchAll((p, s) => getSubjects(organizationId, p, s))
      .then((d) => setSubjects(d.content))
      .catch((err) => onError(err instanceof Error ? err.message : 'Failed to load subjects'))
      .finally(() => setLoading(false))
  }, [organizationId, onError])

  useEffect(load, [load])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setBusy(true)
    try {
      await createSubject(organizationId, form)
      setForm({ code: '', name: '' })
      onSaved('Subject added')
      load()
    } catch (err) {
      setErrors(fieldErrorMap(err))
      onError(err instanceof Error ? err.message : 'Failed to add subject')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!toDelete) return
    setBusy(true)
    try {
      await deleteSubject(organizationId, toDelete.id)
      onSaved('Subject deleted')
      setToDelete(null)
      load()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to delete subject')
      setToDelete(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {canWrite && (
        <form className="row g-2 mb-4 align-items-end" onSubmit={add} noValidate>
          <div className="col-md-2">
            <label className="form-label small mb-1" htmlFor="sub-code">Code</label>
            <input id="sub-code" className={`form-control form-control-sm${errors.code ? ' is-invalid' : ''}`} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            {errors.code && <div className="invalid-feedback">{errors.code}</div>}
          </div>
          <div className="col-md-4">
            <label className="form-label small mb-1" htmlFor="sub-name">Name</label>
            <input id="sub-name" className={`form-control form-control-sm${errors.name ? ' is-invalid' : ''}`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            {errors.name && <div className="invalid-feedback">{errors.name}</div>}
          </div>
          <div className="col-md-2">
            <button type="submit" className="btn btn-sm btn-primary" disabled={busy}>Add subject</button>
          </div>
        </form>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : subjects.length === 0 ? (
        <p className="text-muted">No subjects yet.</p>
      ) : (
        <div className="table-responsive">
          <table className="table align-middle app-table">
            <caption className="visually-hidden">Subjects</caption>
            <thead>
              <tr>
                <th scope="col">Code</th>
                <th scope="col">Name</th>
                {canWrite && <th scope="col">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => (
                <tr key={s.id}>
                  <td className="fw-semibold">{s.code}</td>
                  <td>{s.name}</td>
                  {canWrite && (
                    <td>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => setToDelete(s)}>Delete</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        message={`Delete subject ${toDelete?.name ?? ''}?`}
        loading={busy}
        loadingLabel="Deleting..."
      />
    </>
  )
}

export default Settings
