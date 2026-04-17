import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getAssignmentsByFaculty,
  createFacultyAssignment,
  updateFacultyAssignment,
  deleteFacultyAssignment,
} from '../api/facultyAssignmentApi.ts'
import { getAcademicClasses } from '../api/academicClassApi.ts'
import { getFacultyById } from '../api/facultyApi.ts'
import { useToast } from '../hooks/useToast.ts'
import { useCanWrite } from '../hooks/useCanWrite.ts'
import { WRITE_ROLES } from '../config/roles.ts'
import type {
  FacultyAssignmentResponse,
  AssignmentType,
  AssignmentStatus,
} from '../types/facultyAssignment.ts'
import type { AcademicClassResponse } from '../types/academicClass.ts'
import StatusBadge from '../components/StatusBadge.tsx'
import Pagination from '../components/Pagination.tsx'
import Toast from '../components/Toast.tsx'
import ConfirmModal from '../components/ConfirmModal.tsx'
import Modal from '../components/Modal.tsx'
import { ASSIGNMENT_TYPE_OPTIONS, ASSIGNMENT_STATUS_OPTIONS } from '../constants/statuses.ts'
import LoadingSpinner from '../components/LoadingSpinner.tsx'
import EmptyState from '../components/EmptyState.tsx'

function FacultyAssignments() {
  const { organizationId, branchId, facultyId } = useParams<{
    organizationId: string
    branchId: string
    facultyId: string
  }>()
  const navigate = useNavigate()
  const canWrite = useCanWrite(WRITE_ROLES.facultyAssignments)
  const { toast, showSuccess, showError, dismiss } = useToast()

  const [facultyName, setFacultyName] = useState('')
  const [assignments, setAssignments] = useState<FacultyAssignmentResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Class name lookup
  const [classNameMap, setClassNameMap] = useState<Map<string, string>>(new Map())
  const [classes, setClasses] = useState<AcademicClassResponse[]>([])

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<FacultyAssignmentResponse | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Create modal — multi-select
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createAssignmentType, setCreateAssignmentType] = useState<AssignmentType>('SUBJECT_TEACHER')
  const [createSubjectName, setCreateSubjectName] = useState('')
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set())
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({})

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editTarget, setEditTarget] = useState<FacultyAssignmentResponse | null>(null)
  const [editAssignmentType, setEditAssignmentType] = useState<AssignmentType>('SUBJECT_TEACHER')
  const [editStatus, setEditStatus] = useState<AssignmentStatus>('ACTIVE')
  const [editSubmitting, setEditSubmitting] = useState(false)

  // Fetch faculty name
  useEffect(() => {
    if (!organizationId || !facultyId) return
    getFacultyById(organizationId, facultyId)
      .then((f) => setFacultyName(`${f.firstName} ${f.lastName}`))
      .catch(() => setFacultyName('Unknown Faculty'))
  }, [organizationId, facultyId])

  // Fetch classes for name lookup + create form
  useEffect(() => {
    if (!organizationId || !branchId) return
    getAcademicClasses(organizationId, branchId, 0, 200)
      .then((data) => {
        setClasses(data.content)
        const map = new Map<string, string>()
        for (const c of data.content) map.set(c.id, `${c.name} - ${c.section}`)
        setClassNameMap(map)
      })
      .catch(() => setClasses([]))
  }, [organizationId, branchId])

  const fetchAssignments = useCallback(async () => {
    if (!organizationId || !branchId || !facultyId) return
    setLoading(true)
    setError('')
    try {
      const data = await getAssignmentsByFaculty(organizationId, branchId, facultyId, page, 10)
      setAssignments(data.content)
      setTotalPages(data.page.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }, [organizationId, branchId, facultyId, page])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  // Group classes by academic year for the checklist
  const classGroups = useMemo(() => {
    const groups = new Map<string, AcademicClassResponse[]>()
    for (const c of classes) {
      const year = c.academicYear || 'Unknown'
      if (!groups.has(year)) groups.set(year, [])
      groups.get(year)!.push(c)
    }
    // Sort years descending (most recent first)
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [classes])

  // Already assigned class IDs (to show a hint)
  const assignedClassIds = useMemo(
    () => new Set(assignments.filter((a) => a.status === 'ACTIVE').map((a) => a.classId)),
    [assignments],
  )

  // Toggle class selection
  const toggleClass = (classId: string) => {
    setSelectedClassIds((prev) => {
      const next = new Set(prev)
      if (next.has(classId)) next.delete(classId)
      else next.add(classId)
      return next
    })
    setCreateErrors((prev) => { const n = { ...prev }; delete n.classes; return n })
  }

  // Select/deselect all in a year group
  const toggleYearGroup = (yearClasses: AcademicClassResponse[]) => {
    const ids = yearClasses.map((c) => c.id)
    const allSelected = ids.every((id) => selectedClassIds.has(id))
    setSelectedClassIds((prev) => {
      const next = new Set(prev)
      for (const id of ids) {
        if (allSelected) next.delete(id)
        else next.add(id)
      }
      return next
    })
    setCreateErrors((prev) => { const n = { ...prev }; delete n.classes; return n })
  }

  // Create handlers
  const openCreateModal = () => {
    setCreateAssignmentType('SUBJECT_TEACHER')
    setCreateSubjectName('')
    setSelectedClassIds(new Set())
    setCreateErrors({})
    setShowCreateModal(true)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organizationId || !branchId || !facultyId) return
    const errors: Record<string, string> = {}
    if (selectedClassIds.size === 0) errors.classes = 'Select at least one class'
    if (createAssignmentType !== 'CLASS_TEACHER' && !createSubjectName.trim()) errors.subjectName = 'Subject name is required for this type'
    setCreateErrors(errors)
    if (Object.keys(errors).length > 0) return

    setCreateSubmitting(true)
    let successCount = 0
    let failCount = 0
    try {
      const promises = [...selectedClassIds].map(async (classId) => {
        const cls = classes.find((c) => c.id === classId)
        try {
          await createFacultyAssignment(organizationId, branchId, {
            facultyId,
            classId,
            academicYear: cls?.academicYear ?? '',
            assignmentType: createAssignmentType,
            subjectName: createAssignmentType !== 'CLASS_TEACHER' ? createSubjectName.trim() : undefined,
          })
          successCount++
        } catch {
          failCount++
        }
      })
      await Promise.all(promises)

      if (failCount === 0) {
        showSuccess(`${successCount} assignment${successCount > 1 ? 's' : ''} created successfully`)
      } else {
        showError(`${successCount} created, ${failCount} failed (may already exist)`)
      }
      setShowCreateModal(false)
      fetchAssignments()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create assignments')
    } finally {
      setCreateSubmitting(false)
    }
  }

  // Edit handlers
  const openEditModal = (assignment: FacultyAssignmentResponse) => {
    setEditTarget(assignment)
    setEditAssignmentType(assignment.assignmentType)
    setEditStatus(assignment.status)
    setShowEditModal(true)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organizationId || !branchId || !editTarget) return
    setEditSubmitting(true)
    try {
      await updateFacultyAssignment(organizationId, branchId, editTarget.id, {
        assignmentType: editAssignmentType,
        status: editStatus,
      })
      showSuccess('Assignment updated successfully')
      setShowEditModal(false)
      setEditTarget(null)
      fetchAssignments()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update assignment')
    } finally {
      setEditSubmitting(false)
    }
  }

  // Delete handler
  const handleDelete = async () => {
    if (!organizationId || !branchId || !deleteTarget) return
    setDeleting(true)
    try {
      await deleteFacultyAssignment(organizationId, branchId, deleteTarget.id)
      showSuccess('Assignment deleted successfully')
      setDeleteTarget(null)
      fetchAssignments()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete assignment')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="page-container">
      {toast && <Toast message={toast.message} type={toast.type} onClose={dismiss} />}

      <div className="mb-3">
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => navigate(`/organizations/${organizationId}/faculty`)}
        >
          &larr; Back to Faculty
        </button>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title">Faculty Assignments</h1>
          {facultyName && <p className="text-muted mb-0">{facultyName}</p>}
        </div>
        {canWrite && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            + Assign Classes
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <LoadingSpinner />
      ) : assignments.length === 0 ? (
        <EmptyState message="No assignments found for this faculty member." />
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-hover align-middle app-table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Subject</th>
                  <th>Academic Year</th>
                  <th>Type</th>
                  <th>Status</th>
                  {canWrite && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id}>
                    <td className="fw-semibold">{classNameMap.get(a.classId) ?? a.classId}</td>
                    <td>{a.subjectName ?? '—'}</td>
                    <td>{a.academicYear}</td>
                    <td><StatusBadge status={a.assignmentType} /></td>
                    <td><StatusBadge status={a.status} /></td>
                    {canWrite && (
                      <td>
                        <button
                          className="btn btn-sm btn-outline-primary me-2"
                          onClick={() => openEditModal(a)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setDeleteTarget(a)}
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

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        message={`Are you sure you want to delete this assignment${deleteTarget ? ` for ${classNameMap.get(deleteTarget.classId) ?? deleteTarget.classId}` : ''}?`}
        detail="This action cannot be undone."
        loading={deleting}
      />

      {/* Create Assignment Modal — Multi-select */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Assign Classes"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </button>
            <button type="submit" form="create-assignment-form" className="btn btn-primary" disabled={createSubmitting}>
              {createSubmitting ? 'Creating...' : `Assign ${selectedClassIds.size > 0 ? `(${selectedClassIds.size})` : ''}`}
            </button>
          </>
        }
      >
        <form id="create-assignment-form" onSubmit={handleCreate} noValidate>
          {/* Step 1: Type and Subject */}
          <div className="row mb-3">
            <div className={createAssignmentType !== 'CLASS_TEACHER' ? 'col-md-6' : 'col-12'}>
              <label htmlFor="createAssignmentType" className="form-label">Assignment Type <span className="text-danger">*</span></label>
              <select
                id="createAssignmentType"
                className="form-select"
                value={createAssignmentType}
                onChange={(e) => setCreateAssignmentType(e.target.value as AssignmentType)}
              >
                {ASSIGNMENT_TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            {createAssignmentType !== 'CLASS_TEACHER' && (
              <div className="col-md-6">
                <label htmlFor="createSubjectName" className="form-label">Subject <span className="text-danger">*</span></label>
                <input
                  id="createSubjectName"
                  className={`form-control${createErrors.subjectName ? ' is-invalid' : ''}`}
                  value={createSubjectName}
                  onChange={(e) => { setCreateSubjectName(e.target.value); setCreateErrors((prev) => { const n = { ...prev }; delete n.subjectName; return n }) }}
                  placeholder="e.g. Mathematics"
                />
                {createErrors.subjectName && <div className="invalid-feedback">{createErrors.subjectName}</div>}
              </div>
            )}
          </div>

          {/* Step 2: Class checklist grouped by year */}
          <div className="mb-2">
            <label className="form-label">Select Classes <span className="text-danger">*</span></label>
            {createErrors.classes && (
              <div className="text-danger small mb-1">{createErrors.classes}</div>
            )}
          </div>

          {classGroups.length === 0 ? (
            <p className="text-muted small">No classes found in this branch.</p>
          ) : (
            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '0.375rem', padding: '0.5rem' }}>
              {classGroups.map(([year, yearClasses]) => {
                const yearIds = yearClasses.map((c) => c.id)
                const allSelected = yearIds.every((id) => selectedClassIds.has(id))
                const someSelected = yearIds.some((id) => selectedClassIds.has(id))

                return (
                  <div key={year} className="mb-2">
                    <div className="d-flex align-items-center mb-1">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
                          onChange={() => toggleYearGroup(yearClasses)}
                          id={`year-${year}`}
                        />
                        <label className="form-check-label fw-semibold small" htmlFor={`year-${year}`}>
                          {year}
                        </label>
                      </div>
                    </div>
                    <div className="ps-4">
                      {yearClasses.map((cls) => {
                        const alreadyAssigned = assignedClassIds.has(cls.id)
                        return (
                          <div key={cls.id} className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={selectedClassIds.has(cls.id)}
                              onChange={() => toggleClass(cls.id)}
                              id={`class-${cls.id}`}
                            />
                            <label className="form-check-label small" htmlFor={`class-${cls.id}`}>
                              {cls.name} - {cls.section}
                              {alreadyAssigned && (
                                <span className="badge bg-secondary bg-opacity-25 text-secondary ms-2" style={{ fontSize: '0.7rem' }}>
                                  already assigned
                                </span>
                              )}
                            </label>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {selectedClassIds.size > 0 && (
            <div className="mt-2">
              <small className="text-muted">{selectedClassIds.size} class{selectedClassIds.size > 1 ? 'es' : ''} selected</small>
            </div>
          )}
        </form>
      </Modal>

      {/* Edit Assignment Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setEditTarget(null) }}
        title="Edit Assignment"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => { setShowEditModal(false); setEditTarget(null) }}>
              Cancel
            </button>
            <button type="submit" form="edit-assignment-form" className="btn btn-primary" disabled={editSubmitting}>
              {editSubmitting ? 'Saving...' : 'Update'}
            </button>
          </>
        }
      >
        <form id="edit-assignment-form" onSubmit={handleEdit} noValidate>
          {editTarget && (
            <p className="text-muted mb-3">
              <strong>{classNameMap.get(editTarget.classId) ?? editTarget.classId}</strong>
              {editTarget.subjectName && ` — ${editTarget.subjectName}`}
              {' — '}{editTarget.academicYear}
            </p>
          )}
          <div className="mb-3">
            <label htmlFor="editAssignmentType" className="form-label">Assignment Type</label>
            <select
              id="editAssignmentType"
              className="form-select"
              value={editAssignmentType}
              onChange={(e) => setEditAssignmentType(e.target.value as AssignmentType)}
            >
              {ASSIGNMENT_TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label htmlFor="editStatus" className="form-label">Status</label>
            <select
              id="editStatus"
              className="form-select"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as AssignmentStatus)}
            >
              {ASSIGNMENT_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default FacultyAssignments
