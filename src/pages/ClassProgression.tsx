import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getClassProgression, setClassProgression } from '../api/classProgressionApi.ts'
import { getAcademicClasses } from '../api/academicClassApi.ts'
import { getBranchById } from '../api/branchApi.ts'
import { useToast } from '../hooks/useToast.ts'
import { useCanWrite } from '../hooks/useCanWrite.ts'
import { WRITE_ROLES } from '../config/roles.ts'
import type { ClassLevel } from '../types/classProgression.ts'
import type { AcademicClassResponse } from '../types/academicClass.ts'
import Toast from '../components/Toast.tsx'
import LoadingSpinner from '../components/LoadingSpinner.tsx'
import EmptyState from '../components/EmptyState.tsx'

function ClassProgression() {
  const { organizationId, branchId } = useParams<{
    organizationId: string
    branchId: string
  }>()
  const navigate = useNavigate()
  const canWrite = useCanWrite(WRITE_ROLES.classProgression)
  const { toast, showSuccess, showError, dismiss } = useToast()

  const [branchName, setBranchName] = useState('')
  const [sequence, setSequence] = useState<ClassLevel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Available classes from the branch
  const [branchClasses, setBranchClasses] = useState<AcademicClassResponse[]>([])

  // Fetch branch name
  useEffect(() => {
    if (!organizationId || !branchId) return
    getBranchById(organizationId, branchId)
      .then((b) => setBranchName(b.name))
      .catch(() => setBranchName('Unknown Branch'))
  }, [organizationId, branchId])

  // Fetch classes for dropdown
  useEffect(() => {
    if (!organizationId || !branchId) return
    getAcademicClasses(organizationId, branchId, 0, 200)
      .then((data) => setBranchClasses(data.content))
      .catch(() => setBranchClasses([]))
  }, [organizationId, branchId])

  const fetchProgression = useCallback(async () => {
    if (!organizationId || !branchId) return
    setLoading(true)
    setError('')
    try {
      const data = await getClassProgression(organizationId, branchId)
      setSequence(data.sequence)
      setDirty(false)
    } catch (err) {
      // 404 means no progression set yet — start with empty
      if (err instanceof Error && err.message.includes('404')) {
        setSequence([])
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load class progression')
      }
    } finally {
      setLoading(false)
    }
  }, [organizationId, branchId])

  useEffect(() => {
    fetchProgression()
  }, [fetchProgression])

  // Deduplicated class names from the branch (unique names across sections/years)
  const availableClassNames = useMemo(() => {
    const namesInSequence = new Set(sequence.map((l) => l.className.toLowerCase()))
    const uniqueNames = new Map<string, string>()
    for (const cls of branchClasses) {
      const key = cls.name.toLowerCase()
      if (!uniqueNames.has(key) && !namesInSequence.has(key)) {
        uniqueNames.set(key, cls.name)
      }
    }
    return [...uniqueNames.values()].sort()
  }, [branchClasses, sequence])

  const addFromDropdown = (className: string) => {
    if (!className) return
    setSequence((prev) => [
      ...prev,
      { className, displayOrder: prev.length + 1, isTerminal: false },
    ])
    setDirty(true)
  }

  const removeLevel = (index: number) => {
    setSequence((prev) => {
      const updated = prev.filter((_, i) => i !== index)
      return updated.map((level, i) => ({ ...level, displayOrder: i + 1 }))
    })
    setDirty(true)
  }

  const updateTerminal = (index: number, isTerminal: boolean) => {
    setSequence((prev) =>
      prev.map((level, i) => (i === index ? { ...level, isTerminal } : level)),
    )
    setDirty(true)
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    setSequence((prev) => {
      const updated = [...prev]
      const temp = updated[index - 1]
      updated[index - 1] = { ...updated[index], displayOrder: index }
      updated[index] = { ...temp, displayOrder: index + 1 }
      return updated
    })
    setDirty(true)
  }

  const moveDown = (index: number) => {
    if (index >= sequence.length - 1) return
    setSequence((prev) => {
      const updated = [...prev]
      const temp = updated[index + 1]
      updated[index + 1] = { ...updated[index], displayOrder: index + 2 }
      updated[index] = { ...temp, displayOrder: index + 1 }
      return updated
    })
    setDirty(true)
  }

  const handleSave = async () => {
    if (!organizationId || !branchId) return
    for (const level of sequence) {
      if (!level.className.trim()) {
        showError('All class names are required')
        return
      }
    }
    const names = sequence.map((l) => l.className.trim().toLowerCase())
    if (new Set(names).size !== names.length) {
      showError('Class names must be unique')
      return
    }
    const terminalCount = sequence.filter((l) => l.isTerminal).length
    if (sequence.length > 0 && terminalCount === 0) {
      showError('At least one class must be marked as terminal (final class)')
      return
    }

    setSaving(true)
    try {
      const data = await setClassProgression(organizationId, branchId, { sequence })
      setSequence(data.sequence)
      setDirty(false)
      showSuccess('Class progression saved successfully')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save class progression')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-container">
      {toast && <Toast message={toast.message} type={toast.type} onClose={dismiss} />}

      <div className="mb-3">
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => navigate(`/organizations/${organizationId}/branches/${branchId}/classes`)}
        >
          &larr; Back to Classes
        </button>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title">Class Progression</h1>
          {branchName && <p className="text-muted mb-0">{branchName}</p>}
          <small className="text-muted">
            Define the order in which students progress through classes. Mark the final class as terminal.
          </small>
        </div>
        <div>
          {canWrite && dirty && (
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Add class dropdown */}
          {canWrite && (
            <div className="row mb-3">
              <div className="col-md-6">
                <div className="input-group">
                  <select
                    className="form-select"
                    id="addClassSelect"
                    defaultValue=""
                    onChange={(e) => {
                      addFromDropdown(e.target.value)
                      e.target.value = ''
                    }}
                  >
                    <option value="" disabled>+ Add a class to the progression...</option>
                    {availableClassNames.length === 0 ? (
                      <option value="" disabled>No more classes available</option>
                    ) : (
                      availableClassNames.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))
                    )}
                  </select>
                </div>
                <small className="text-muted">
                  Select from existing classes in this branch. Classes already in the sequence are excluded.
                </small>
              </div>
            </div>
          )}

          {sequence.length === 0 ? (
            <EmptyState message="No class progression configured yet. Add classes from the dropdown above." />
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle app-table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>Order</th>
                    <th>Class Name</th>
                    <th style={{ width: 100 }}>Terminal</th>
                    {canWrite && <th style={{ width: 200 }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {sequence.map((level, index) => (
                    <tr key={index} className={level.isTerminal ? 'table-warning' : ''}>
                      <td className="fw-semibold">{level.displayOrder}</td>
                      <td>{level.className}</td>
                      <td>
                        {canWrite ? (
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={level.isTerminal}
                              onChange={(e) => updateTerminal(index, e.target.checked)}
                              id={`terminal-${index}`}
                            />
                            <label className="form-check-label" htmlFor={`terminal-${index}`}>
                              {level.isTerminal ? 'Yes' : 'No'}
                            </label>
                          </div>
                        ) : (
                          <span className={`badge ${level.isTerminal ? 'bg-warning' : 'bg-secondary'}`}>
                            {level.isTerminal ? 'Yes' : 'No'}
                          </span>
                        )}
                      </td>
                      {canWrite && (
                        <td>
                          <button
                            className="btn btn-sm btn-outline-secondary me-1"
                            onClick={() => moveUp(index)}
                            disabled={index === 0}
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary me-1"
                            onClick={() => moveDown(index)}
                            disabled={index === sequence.length - 1}
                            title="Move down"
                          >
                            ↓
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeLevel(index)}
                            title="Remove"
                          >
                            Remove
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Visual preview */}
          {sequence.length > 1 && (
            <div className="card mt-4">
              <div className="card-header">
                <h6 className="mb-0">Progression Path</h6>
              </div>
              <div className="card-body">
                <div className="d-flex flex-wrap align-items-center gap-2">
                  {sequence.map((level, index) => (
                    <span key={index}>
                      <span className={`badge fs-6 ${level.isTerminal ? 'bg-warning text-dark' : 'bg-primary'}`}>
                        {level.className || `Level ${level.displayOrder}`}
                      </span>
                      {index < sequence.length - 1 && (
                        <span className="mx-1 text-muted">→</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ClassProgression
