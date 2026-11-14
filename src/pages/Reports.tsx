import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.ts'
import { useAdminBranchScope } from '../hooks/useAdminBranchScope.ts'
import { getOrganizations } from '../api/organizationApi.ts'
import { getBranches } from '../api/branchApi.ts'
import { getAcademicYears } from '../api/catalogApi.ts'
import { getReport, downloadReportCsv } from '../api/reportApi.ts'
import type { ReportKind, Report } from '../api/reportApi.ts'
import type { OrganizationResponse } from '../types/organization.ts'
import type { BranchResponse } from '../types/branch.ts'
import type { AcademicYearResponse } from '../types/catalog.ts'
import LoadingSpinner from '../components/LoadingSpinner.tsx'
import EmptyState from '../components/EmptyState.tsx'
import { fetchAll } from '../api/paging.ts'

const KINDS: { value: ReportKind; label: string }[] = [
  { value: 'enrollment', label: 'Enrollment summary' },
  { value: 'performance', label: 'Exam performance' },
]

function Reports() {
  const { organizationId: routeOrgId } = useParams<{ organizationId?: string }>()
  const { user } = useAuth()
  const { adminBranchId, branchLocked } = useAdminBranchScope()
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'

  const [orgChoice, setOrgChoice] = useState('')
  const organizationId = routeOrgId ?? (isSuperAdmin ? orgChoice : user?.organizationId) ?? ''

  const [organizations, setOrganizations] = useState<OrganizationResponse[]>([])
  const [branches, setBranches] = useState<BranchResponse[]>([])
  const [years, setYears] = useState<AcademicYearResponse[]>([])

  const [kind, setKind] = useState<ReportKind>('enrollment')
  const [academicYear, setAcademicYear] = useState('')
  const [branchId, setBranchId] = useState('')

  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isSuperAdmin || routeOrgId) return
    fetchAll((p, s) => getOrganizations(p, s))
      .then((d) => setOrganizations(d.content))
      .catch(() => { /* ignore */ })
  }, [isSuperAdmin, routeOrgId])

  useEffect(() => {
    setReport(null)
    setBranches([])
    setYears([])
    setAcademicYear('')
    if (!organizationId) return
    fetchAll((p, s) => getBranches(organizationId, p, s))
      .then((d) => setBranches(d.content))
      .catch(() => { /* ignore */ })
    getAcademicYears(organizationId, 0, 50)
      .then((d) => {
        setYears(d.content)
        const current = d.content.find((y) => y.current) ?? d.content[0]
        if (current) setAcademicYear(current.label)
      })
      .catch(() => { /* ignore */ })
  }, [organizationId])

  useEffect(() => {
    if (adminBranchId) setBranchId(adminBranchId)
  }, [adminBranchId])

  const run = async () => {
    setError('')
    setLoading(true)
    try {
      setReport(await getReport(organizationId, kind, academicYear, branchId || undefined))
    } catch (err) {
      setReport(null)
      setError(err instanceof Error ? err.message : 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  const download = async () => {
    setError('')
    setDownloading(true)
    try {
      await downloadReportCsv(organizationId, kind, academicYear, branchId || undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download report')
    } finally {
      setDownloading(false)
    }
  }

  const ready = !!organizationId && !!academicYear

  return (
    <div className="page-container">
      <div className="mb-4">
        <h1 className="page-title">Reports</h1>
      </div>

      <div className="row g-2 mb-4 align-items-end">
        {isSuperAdmin && !routeOrgId && (
          <div className="col-md-3">
            <label className="form-label small mb-1" htmlFor="rep-org">Organization</label>
            <select id="rep-org" className="form-select form-select-sm" value={orgChoice} onChange={(e) => setOrgChoice(e.target.value)}>
              <option value="">Select organization</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="col-md-3">
          <label className="form-label small mb-1" htmlFor="rep-kind">Report</label>
          <select id="rep-kind" className="form-select form-select-sm" value={kind} onChange={(e) => { setKind(e.target.value as ReportKind); setReport(null) }}>
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
        </div>
        <div className="col-md-2">
          <label className="form-label small mb-1" htmlFor="rep-year">Academic year</label>
          <select id="rep-year" className="form-select form-select-sm" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
            {years.length === 0 && <option value="">None defined</option>}
            {years.map((y) => (
              <option key={y.id} value={y.label}>{y.label}{y.current ? ' (current)' : ''}</option>
            ))}
          </select>
        </div>
        <div className="col-md-2">
          <label className="form-label small mb-1" htmlFor="rep-branch">Branch</label>
          <select id="rep-branch" className="form-select form-select-sm" value={branchId} disabled={branchLocked} onChange={(e) => setBranchId(e.target.value)}>
            {!branchLocked && <option value="">All branches</option>}
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div className="col-md-2 d-flex gap-2">
          <button className="btn btn-sm btn-primary" onClick={run} disabled={!ready || loading}>Run</button>
          <button className="btn btn-sm btn-outline-secondary" onClick={download} disabled={!ready || downloading}>
            {downloading ? 'Downloading…' : 'CSV'}
          </button>
        </div>
      </div>

      {years.length === 0 && organizationId && (
        <div className="alert alert-info py-2">
          No academic years are defined for this organization. An administrator can add them under Settings.
        </div>
      )}

      {error && <div className="alert alert-danger" role="alert">{error}</div>}

      {loading ? (
        <LoadingSpinner />
      ) : report ? (
        report.rows.length === 0 ? (
          <EmptyState message="No data for this selection." />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle app-table">
              <caption className="visually-hidden">{report.title} for {report.academicYear}</caption>
              <thead>
                <tr>
                  {report.columns.map((c) => (
                    <th key={c} scope="col">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row, i) => (
                  <tr key={i}>
                    {report.columns.map((c) => (
                      <td key={c}>{row[c] === null || row[c] === undefined ? '' : String(row[c])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <p className="text-muted">Choose a report and academic year, then press Run.</p>
      )}
    </div>
  )
}

export default Reports
