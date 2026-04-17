const STATUS_CLASSES: Record<string, string> = {
  ACTIVE: 'bg-success',
  INACTIVE: 'bg-secondary',
  SUSPENDED: 'bg-danger',
  COMPLETED: 'bg-info',
  GRADUATED: 'bg-primary',
  TRANSFERRED: 'bg-warning',
  DROPPED: 'bg-danger',
  ON_LEAVE: 'bg-warning',
  RESIGNED: 'bg-secondary',
  TERMINATED: 'bg-danger',
  LOCKED: 'bg-danger',
  // Examination statuses
  SCHEDULED: 'bg-primary',
  IN_PROGRESS: 'bg-warning',
  CANCELLED: 'bg-secondary',
  // Exam result statuses
  PASS: 'bg-success',
  FAIL: 'bg-danger',
  ABSENT: 'bg-secondary',
  WITHHELD: 'bg-warning',
  // Enrollment exit reasons
  PROMOTED: 'bg-success',
  HELD_BACK: 'bg-warning',
  // Assignment types
  SUBJECT_TEACHER: 'bg-info',
  CLASS_TEACHER: 'bg-primary',
  BOTH: 'bg-success',
  // Promotion recommendations
  PROMOTE: 'bg-success',
  GRADUATE: 'bg-primary',
  HOLD_BACK: 'bg-warning',
}

interface StatusBadgeProps {
  status: string
}

function formatStatus(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')
}

function StatusBadge({ status }: StatusBadgeProps) {
  const cls = STATUS_CLASSES[status] || 'bg-secondary'
  return <span className={`badge ${cls}`}>{formatStatus(status)}</span>
}

export default StatusBadge
