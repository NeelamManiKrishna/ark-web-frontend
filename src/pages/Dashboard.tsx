import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPlatformDashboard, getOrgDashboard, getBranchDashboard } from '../api/dashboardApi.ts'
import { useAuth } from '../hooks/useAuth.ts'
import { useCanWrite } from '../hooks/useCanWrite.ts'
import { WRITE_ROLES } from '../config/roles.ts'
import type {
  PlatformDashboardResponse,
  OrgDashboardResponse,
  BranchDashboardResponse,
  RecentActivity,
} from '../types/dashboard.ts'
import LoadingSpinner from '../components/LoadingSpinner.tsx'

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="col-sm-6 col-lg-3 mb-3">
      <div className="card border-0 shadow-sm h-100">
        <div className="card-body">
          <div className={`fs-2 fw-bold text-${color}`}>{value.toLocaleString()}</div>
          <div className="text-muted small">{label}</div>
        </div>
      </div>
    </div>
  )
}

function BreakdownCard({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data)
  if (entries.length === 0) return null
  const total = entries.reduce((sum, [, v]) => sum + v, 0)

  return (
    <div className="col-md-6 col-lg-4 mb-3">
      <div className="card border-0 shadow-sm h-100">
        <div className="card-body">
          <h6 className="card-title fw-semibold mb-3">{title}</h6>
          {entries.map(([key, count]) => (
            <div key={key} className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small">{key.replace(/_/g, ' ')}</span>
              <div className="d-flex align-items-center gap-2">
                <div className="progress" style={{ width: '80px', height: '6px' }}>
                  <div
                    className="progress-bar"
                    style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
                  />
                </div>
                <span className="fw-semibold small">{count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MetricTable({ title, data, nameLabel }: { title: string; data: { name: string; count: number }[]; nameLabel: string }) {
  if (data.length === 0) return null

  return (
    <div className="col-md-6 mb-3">
      <div className="card border-0 shadow-sm h-100">
        <div className="card-body">
          <h6 className="card-title fw-semibold mb-3">{title}</h6>
          <table className="table table-sm mb-0">
            <thead>
              <tr>
                <th className="text-muted small">{nameLabel}</th>
                <th className="text-muted small text-end">Count</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.name}>
                  <td>{item.name}</td>
                  <td className="text-end fw-semibold">{item.count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ActivityList({ activities }: { activities: RecentActivity[] }) {
  if (activities.length === 0) return null

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body">
        <h6 className="card-title fw-semibold mb-3">Recent Activity</h6>
        <div className="list-group list-group-flush">
          {activities.map((a, i) => (
            <div key={i} className="list-group-item px-0 d-flex justify-content-between align-items-start">
              <div>
                <span className={`badge me-2 ${getActionBadge(a.action)}`}>{a.action}</span>
                <span className="fw-semibold">{a.entityType}</span>
                {a.entityName && <span className="text-muted"> — {a.entityName}</span>}
                <div className="text-muted small mt-1">by {a.performedByEmail}</div>
              </div>
              <small className="text-muted text-nowrap">{formatTime(a.timestamp)}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function QuickAction({ label, description, onClick }: { label: string; description: string; onClick: () => void }) {
  return (
    <div className="col-sm-6 col-lg-4 mb-3">
      <div
        className="card border-0 shadow-sm h-100"
        style={{ cursor: 'pointer' }}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') onClick() }}
      >
        <div className="card-body d-flex align-items-center">
          <div>
            <h6 className="card-title fw-semibold mb-1">{label}</h6>
            <p className="text-muted small mb-0">{description}</p>
          </div>
          <span className="ms-auto text-muted fs-4">&rarr;</span>
        </div>
      </div>
    </div>
  )
}

function getActionBadge(action: string): string {
  const map: Record<string, string> = {
    CREATE: 'bg-success', UPDATE: 'bg-primary', DELETE: 'bg-danger',
    LOGIN: 'bg-info', LOGOUT: 'bg-secondary', REGISTER: 'bg-warning text-dark',
  }
  return map[action] || 'bg-secondary'
}

function formatTime(ts: string): string {
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return d.toLocaleDateString()
}

function PlatformDashboard({ data }: { data: PlatformDashboardResponse }) {
  return (
    <>
      <div className="row">
        <StatCard label="Organizations" value={data.totalOrganizations} color="primary" />
        <StatCard label="Branches" value={data.totalBranches} color="info" />
        <StatCard label="Students" value={data.totalStudents} color="success" />
        <StatCard label="Faculty" value={data.totalFaculty} color="warning" />
      </div>
      <div className="row">
        <StatCard label="Active Organizations" value={data.activeOrganizations} color="success" />
        <StatCard label="Total Users" value={data.totalUsers} color="secondary" />
      </div>

      <div className="row">
        <BreakdownCard title="Organizations by Status" data={data.organizationsByStatus} />
        <BreakdownCard title="Users by Role" data={data.usersByRole} />
        <BreakdownCard title="Audit Actions" data={data.auditActionCounts} />
      </div>

      <div className="row">
        <MetricTable
          title="Students per Organization"
          nameLabel="Organization"
          data={data.studentsPerOrganization.map((m) => ({ name: m.organizationName, count: m.count }))}
        />
        <MetricTable
          title="Faculty per Organization"
          nameLabel="Organization"
          data={data.facultyPerOrganization.map((m) => ({ name: m.organizationName, count: m.count }))}
        />
      </div>
      <div className="row">
        <MetricTable
          title="Branches per Organization"
          nameLabel="Organization"
          data={data.branchesPerOrganization.map((m) => ({ name: m.organizationName, count: m.count }))}
        />
      </div>

      <ActivityList activities={data.recentActivity} />
    </>
  )
}

function OrgDashboard({ data }: { data: OrgDashboardResponse }) {
  return (
    <>
      <div className="row">
        <StatCard label="Branches" value={data.totalBranches} color="info" />
        <StatCard label="Classes" value={data.totalClasses} color="primary" />
        <StatCard label="Students" value={data.totalStudents} color="success" />
        <StatCard label="Faculty" value={data.totalFaculty} color="warning" />
      </div>
      <div className="row">
        <StatCard label="Users" value={data.totalUsers} color="secondary" />
      </div>

      <div className="row">
        <BreakdownCard title="Students by Status" data={data.studentsByStatus} />
        <BreakdownCard title="Students by Gender" data={data.studentsByGender} />
        <BreakdownCard title="Faculty by Status" data={data.facultyByStatus} />
      </div>
      <div className="row">
        <BreakdownCard title="Users by Role" data={data.usersByRole} />
        <BreakdownCard title="Audit Actions" data={data.auditActionCounts} />
      </div>

      <div className="row">
        <MetricTable
          title="Students per Branch"
          nameLabel="Branch"
          data={data.studentsPerBranch.map((m) => ({ name: m.branchName, count: m.count }))}
        />
        <MetricTable
          title="Faculty per Branch"
          nameLabel="Branch"
          data={data.facultyPerBranch.map((m) => ({ name: m.branchName, count: m.count }))}
        />
      </div>
      <div className="row">
        <MetricTable
          title="Classes per Branch"
          nameLabel="Branch"
          data={data.classesPerBranch.map((m) => ({ name: m.branchName, count: m.count }))}
        />
      </div>

      <ActivityList activities={data.recentActivity} />
    </>
  )
}

function BranchDashboard({ data, orgId, branchId }: { data: BranchDashboardResponse; orgId: string; branchId: string }) {
  const navigate = useNavigate()
  const canWriteClasses = useCanWrite(WRITE_ROLES.classes)
  const canWriteStudents = useCanWrite(WRITE_ROLES.students)
  const canWriteFaculty = useCanWrite(WRITE_ROLES.faculty)

  return (
    <>
      <div className="row">
        <StatCard label="Classes" value={data.totalClasses} color="primary" />
        <StatCard label="Students" value={data.totalStudents} color="success" />
        <StatCard label="Faculty" value={data.totalFaculty} color="warning" />
      </div>

      <h6 className="fw-semibold mb-3">Quick Actions</h6>
      <div className="row">
        <QuickAction
          label={canWriteClasses ? 'Manage Classes' : 'View Classes'}
          description={`${data.totalClasses} classes in this branch`}
          onClick={() => navigate(`/organizations/${orgId}/branches/${branchId}/classes`)}
        />
        <QuickAction
          label={canWriteStudents ? 'Manage Students' : 'View Students'}
          description={`${data.totalStudents} enrolled students`}
          onClick={() => navigate(`/organizations/${orgId}/students`)}
        />
        <QuickAction
          label={canWriteFaculty ? 'Manage Faculty' : 'View Faculty'}
          description={`${data.totalFaculty} faculty members`}
          onClick={() => navigate(`/organizations/${orgId}/faculty`)}
        />
      </div>

      <div className="row">
        <BreakdownCard title="Students by Status" data={data.studentsByStatus} />
        <BreakdownCard title="Students by Gender" data={data.studentsByGender} />
        <BreakdownCard title="Faculty by Status" data={data.facultyByStatus} />
      </div>
      <div className="row">
        <BreakdownCard title="Faculty by Department" data={data.facultyByDepartment} />
      </div>

      {data.studentsPerClass.length > 0 && (
        <div className="row">
          <MetricTable
            title="Students per Class"
            nameLabel="Class"
            data={data.studentsPerClass.map((m) => ({
              name: m.section ? `${m.className} (${m.section})` : m.className,
              count: m.count,
            }))}
          />
        </div>
      )}

      <ActivityList activities={data.recentActivity} />
    </>
  )
}

function Dashboard() {
  const { user } = useAuth()
  const role = user?.role
  const isSuperAdmin = role === 'SUPER_ADMIN'
  const hasBranch = !!user?.branchId

  const [platformData, setPlatformData] = useState<PlatformDashboardResponse | null>(null)
  const [orgData, setOrgData] = useState<OrgDashboardResponse | null>(null)
  const [branchData, setBranchData] = useState<BranchDashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        if (isSuperAdmin) {
          const data = await getPlatformDashboard()
          if (!cancelled) setPlatformData(data)
        } else if (hasBranch && user?.organizationId && user?.branchId) {
          const data = await getBranchDashboard(user.organizationId, user.branchId)
          if (!cancelled) setBranchData(data)
        } else if (user?.organizationId) {
          const data = await getOrgDashboard(user.organizationId)
          if (!cancelled) setOrgData(data)
        }
        if (!cancelled) setError('')
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [isSuperAdmin, hasBranch, user?.organizationId, user?.branchId])

  function getSubtitle(): string {
    if (isSuperAdmin) return 'Platform Overview'
    if (branchData) return `${branchData.branchName} — ${branchData.organizationName}`
    if (orgData) return orgData.organizationName
    return 'Welcome to ARK'
  }

  return (
    <div className="page-container">
      <div className="mb-4">
        <h1 className="page-title">Dashboard</h1>
        <p className="text-muted mb-0">{getSubtitle()}</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {isSuperAdmin && platformData && <PlatformDashboard data={platformData} />}
          {!isSuperAdmin && orgData && <OrgDashboard data={orgData} />}
          {!isSuperAdmin && branchData && user?.organizationId && user?.branchId && (
            <BranchDashboard data={branchData} orgId={user.organizationId} branchId={user.branchId} />
          )}
        </>
      )}
    </div>
  )
}

export default Dashboard
