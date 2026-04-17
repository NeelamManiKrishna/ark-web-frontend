import { useEffect, useState, useCallback } from 'react'
import { getAuditLogs } from '../api/auditLogApi.ts'
import { getOrganizations } from '../api/organizationApi.ts'
import type { AuditLogResponse, AuditAction } from '../types/auditLog.ts'
import type { OrganizationResponse } from '../types/organization.ts'
import SortableHeader from '../components/SortableHeader.tsx'
import Pagination from '../components/Pagination.tsx'
import LoadingSpinner from '../components/LoadingSpinner.tsx'
import EmptyState from '../components/EmptyState.tsx'

const ACTIONS: AuditAction[] = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'REGISTER']

const ACTION_CLASSES: Record<string, string> = {
  CREATE: 'bg-success',
  UPDATE: 'bg-primary',
  DELETE: 'bg-danger',
  LOGIN: 'bg-info',
  LOGIN_FAILED: 'bg-danger',
  LOGOUT: 'bg-secondary',
  REGISTER: 'bg-warning text-dark',
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts)
  return d.toLocaleString()
}

function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [sort, setSort] = useState('timestamp,desc')

  // Filters
  const [filterOrgId, setFilterOrgId] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterEntityType, setFilterEntityType] = useState('')
  const [filterUserId, setFilterUserId] = useState('')

  // Orgs for filter dropdown
  const [organizations, setOrganizations] = useState<OrganizationResponse[]>([])

  useEffect(() => {
    getOrganizations(0, 100)
      .then((data) => setOrganizations(data.content))
      .catch(() => { /* ignore */ })
  }, [])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getAuditLogs(
        page,
        20,
        filterOrgId || undefined,
        filterAction || undefined,
        filterEntityType || undefined,
        filterUserId || undefined,
        sort,
      )
      setLogs(data.content)
      setTotalPages(data.page.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }, [page, filterOrgId, filterAction, filterEntityType, filterUserId, sort])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  useEffect(() => { setPage(0) }, [sort])

  const handleFilterChange = (setter: (v: string) => void) => (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>,
  ) => {
    setter(e.target.value)
    setPage(0)
  }

  return (
    <div className="page-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="page-title">Audit Logs</h1>
      </div>

      {/* Filters */}
      <div className="row g-2 mb-4">
        <div className="col-md-3">
          <select
            className="form-select form-select-sm"
            value={filterOrgId}
            onChange={handleFilterChange(setFilterOrgId)}
          >
            <option value="">All Organizations</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>
        <div className="col-md-2">
          <select
            className="form-select form-select-sm"
            value={filterAction}
            onChange={handleFilterChange(setFilterAction)}
          >
            <option value="">All Actions</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="col-md-2">
          <input
            className="form-control form-control-sm"
            placeholder="Entity Type"
            value={filterEntityType}
            onChange={handleFilterChange(setFilterEntityType)}
          />
        </div>
        <div className="col-md-3">
          <input
            className="form-control form-control-sm"
            placeholder="User ID"
            value={filterUserId}
            onChange={handleFilterChange(setFilterUserId)}
          />
        </div>
        <div className="col-md-2">
          <button
            className="btn btn-sm btn-outline-secondary w-100"
            onClick={() => {
              setFilterOrgId('')
              setFilterAction('')
              setFilterEntityType('')
              setFilterUserId('')
              setPage(0)
            }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <LoadingSpinner />
      ) : logs.length === 0 ? (
        <EmptyState message="No audit logs found." />
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-hover align-middle app-table">
              <thead>
                <tr>
                  <SortableHeader label="Timestamp" field="timestamp" currentSort={sort} onSort={setSort} />
                  <SortableHeader label="Action" field="action" currentSort={sort} onSort={setSort} />
                  <SortableHeader label="Entity Type" field="entityType" currentSort={sort} onSort={setSort} />
                  <th>Entity Name</th>
                  <th>Performed By</th>
                  <th>Role</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-nowrap">{formatTimestamp(log.timestamp)}</td>
                    <td>
                      <span className={`badge ${ACTION_CLASSES[log.action] || 'bg-secondary'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td>{log.entityType}</td>
                    <td className="fw-semibold">{log.entityName || log.entityId}</td>
                    <td>
                      <div>{log.performedByEmail}</div>
                    </td>
                    <td>
                      <span className="badge bg-secondary">{log.performedByRole}</span>
                    </td>
                    <td className="text-muted" style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}

export default AuditLogs
