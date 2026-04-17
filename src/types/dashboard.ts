export interface OrgMetric {
  organizationId: string
  organizationName: string
  count: number
}

export interface BranchMetric {
  branchId: string
  branchName: string
  count: number
}

export interface RecentActivity {
  action: string
  entityType: string
  entityName: string
  performedByEmail: string
  timestamp: string
}

export interface PlatformDashboardResponse {
  totalOrganizations: number
  activeOrganizations: number
  totalBranches: number
  totalStudents: number
  totalFaculty: number
  totalUsers: number
  organizationsByStatus: Record<string, number>
  studentsPerOrganization: OrgMetric[]
  facultyPerOrganization: OrgMetric[]
  branchesPerOrganization: OrgMetric[]
  usersByRole: Record<string, number>
  auditActionCounts: Record<string, number>
  recentActivity: RecentActivity[]
}

export interface ClassMetric {
  classId: string
  className: string
  section: string
  count: number
}

export interface BranchDashboardResponse {
  organizationId: string
  organizationName: string
  branchId: string
  branchName: string
  totalClasses: number
  totalStudents: number
  totalFaculty: number
  studentsByStatus: Record<string, number>
  studentsByGender: Record<string, number>
  facultyByStatus: Record<string, number>
  facultyByDepartment: Record<string, number>
  studentsPerClass: ClassMetric[]
  recentActivity: RecentActivity[]
}

export interface OrgDashboardResponse {
  organizationId: string
  organizationName: string
  totalBranches: number
  totalClasses: number
  totalStudents: number
  totalFaculty: number
  totalUsers: number
  studentsByStatus: Record<string, number>
  studentsByGender: Record<string, number>
  facultyByStatus: Record<string, number>
  studentsPerBranch: BranchMetric[]
  facultyPerBranch: BranchMetric[]
  classesPerBranch: BranchMetric[]
  usersByRole: Record<string, number>
  auditActionCounts: Record<string, number>
  recentActivity: RecentActivity[]
}
