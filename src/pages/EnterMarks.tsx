import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getExaminations, getExamSubjects, getExamResults, createExamResult, updateExamResult } from '../api/examinationApi.ts'
import { getAcademicClassById } from '../api/academicClassApi.ts'
import { getStudents } from '../api/studentApi.ts'
import { useToast } from '../hooks/useToast.ts'
import { useCanWrite } from '../hooks/useCanWrite.ts'
import { WRITE_ROLES } from '../config/roles.ts'
import type { ExaminationResponse, ExamSubjectResponse, ExamResultResponse } from '../types/examination.ts'
import type { StudentResponse } from '../types/student.ts'
import Toast from '../components/Toast.tsx'
import LoadingSpinner from '../components/LoadingSpinner.tsx'
import EmptyState from '../components/EmptyState.tsx'
import StatusBadge from '../components/StatusBadge.tsx'

interface MarkEntry {
  studentId: string
  studentName: string
  existingResult: ExamResultResponse | null
  marks: string
  remarks: string
  dirty: boolean
}

function EnterMarks() {
  const { organizationId, branchId, classId } = useParams<{
    organizationId: string
    branchId: string
    classId: string
  }>()
  const navigate = useNavigate()
  const canWrite = useCanWrite(WRITE_ROLES.examinations)
  const { toast, showSuccess, showError, dismiss } = useToast()

  const [className, setClassName] = useState('')
  const [exams, setExams] = useState<ExaminationResponse[]>([])
  const [subjects, setSubjects] = useState<ExamSubjectResponse[]>([])
  const [students, setStudents] = useState<StudentResponse[]>([])

  const [selectedExamId, setSelectedExamId] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [entries, setEntries] = useState<MarkEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === selectedSubjectId) ?? null,
    [subjects, selectedSubjectId],
  )

  // Subjects filtered to this class
  const classSubjects = useMemo(
    () => subjects.filter((s) => s.classId === classId),
    [subjects, classId],
  )

  const dirtyCount = useMemo(() => entries.filter((e) => e.dirty).length, [entries])

  // Fetch class name
  useEffect(() => {
    if (!organizationId || !branchId || !classId) return
    getAcademicClassById(organizationId, branchId, classId)
      .then((cls) => setClassName(`${cls.name}${cls.section ? ' - ' + cls.section : ''}`))
      .catch(() => setClassName('Unknown Class'))
  }, [organizationId, branchId, classId])

  // Fetch exams for branch + students for class
  useEffect(() => {
    if (!organizationId || !branchId || !classId) return
    setInitialLoading(true)
    Promise.all([
      getExaminations(organizationId, branchId, 0, 100),
      getStudents(organizationId, 0, 200, branchId, classId),
    ])
      .then(([examData, studentData]) => {
        setExams(examData.content)
        setStudents(studentData.content)
      })
      .catch(() => {
        setExams([])
        setStudents([])
      })
      .finally(() => setInitialLoading(false))
  }, [organizationId, branchId, classId])

  // Fetch subjects when exam changes
  useEffect(() => {
    if (!organizationId || !selectedExamId) {
      setSubjects([])
      setSelectedSubjectId('')
      return
    }
    getExamSubjects(organizationId, selectedExamId, 0, 100)
      .then((data) => {
        setSubjects(data.content)
        setSelectedSubjectId('')
      })
      .catch(() => setSubjects([]))
  }, [organizationId, selectedExamId])

  // Build mark entries when subject is selected
  const loadMarks = useCallback(async () => {
    if (!organizationId || !selectedExamId || !selectedSubjectId || students.length === 0) {
      setEntries([])
      return
    }
    setEntries([]) // Clear previous subject's marks immediately
    setLoading(true)
    try {
      const resultsData = await getExamResults(organizationId, selectedExamId, selectedSubjectId, 0, 1000)
      const resultMap = new Map<string, ExamResultResponse>()
      for (const r of resultsData.content) {
        // Safety: only include results for the selected subject
        if (r.examSubjectId === selectedSubjectId) {
          resultMap.set(r.studentId, r)
        }
      }

      const newEntries: MarkEntry[] = students.map((s) => {
        const existing = resultMap.get(s.id) ?? null
        return {
          studentId: s.id,
          studentName: `${s.firstName} ${s.lastName}`,
          existingResult: existing,
          marks: existing ? String(existing.marksObtained) : '',
          remarks: existing ? (existing.remarks ?? '') : '',
          dirty: false,
        }
      })
      setEntries(newEntries)
    } catch {
      setEntries([])
      showError('Failed to load marks')
    } finally {
      setLoading(false)
    }
  }, [organizationId, selectedExamId, selectedSubjectId, students, showError])

  useEffect(() => {
    loadMarks()
  }, [loadMarks])

  const updateEntry = (index: number, field: 'marks' | 'remarks', value: string) => {
    setEntries((prev) =>
      prev.map((e, i) => {
        if (i !== index) return e
        const updated = { ...e, [field]: value, dirty: true }
        return updated
      }),
    )
  }

  const handleSaveAll = async () => {
    if (!organizationId || !selectedExamId || !selectedSubjectId) return

    // Validate marks
    for (const entry of entries) {
      if (!entry.dirty) continue
      if (entry.marks === '') continue // skip empty (not entered)
      const num = Number(entry.marks)
      if (isNaN(num) || num < 0) {
        showError(`Invalid marks for ${entry.studentName}`)
        return
      }
      if (selectedSubject && num > selectedSubject.maxMarks) {
        showError(`Marks for ${entry.studentName} exceed max (${selectedSubject.maxMarks})`)
        return
      }
    }

    setSaving(true)
    let successCount = 0
    let failCount = 0

    const promises = entries
      .filter((e) => e.dirty && e.marks !== '')
      .map(async (entry) => {
        try {
          if (entry.existingResult) {
            await updateExamResult(organizationId, selectedExamId, entry.existingResult.id, {
              marksObtained: Number(entry.marks),
              remarks: entry.remarks || undefined,
            })
          } else {
            await createExamResult(organizationId, selectedExamId, selectedSubjectId, {
              studentId: entry.studentId,
              marksObtained: Number(entry.marks),
              remarks: entry.remarks,
            })
          }
          successCount++
        } catch {
          failCount++
        }
      })

    await Promise.all(promises)
    setSaving(false)

    if (failCount === 0) {
      showSuccess(`${successCount} result${successCount > 1 ? 's' : ''} saved successfully`)
    } else {
      showError(`${successCount} saved, ${failCount} failed`)
    }

    // Reload to get updated grades/statuses from backend
    loadMarks()
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
          <h1 className="page-title">Enter Marks</h1>
          {className && <p className="text-muted mb-0">{className}</p>}
        </div>
        {canWrite && dirtyCount > 0 && (
          <button
            className="btn btn-primary"
            onClick={handleSaveAll}
            disabled={saving}
          >
            {saving ? 'Saving...' : `Save All (${dirtyCount})`}
          </button>
        )}
      </div>

      {initialLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Exam and Subject selectors */}
          <div className="row mb-4">
            <div className="col-md-4">
              <label htmlFor="examSelect" className="form-label fw-semibold">Examination</label>
              <select
                id="examSelect"
                className="form-select"
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
              >
                <option value="">Select Examination</option>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name} ({exam.academicYear})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label htmlFor="subjectSelect" className="form-label fw-semibold">Subject</label>
              <select
                id="subjectSelect"
                className="form-select"
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                disabled={!selectedExamId || classSubjects.length === 0}
              >
                <option value="">
                  {!selectedExamId ? 'Select exam first' : classSubjects.length === 0 ? 'No subjects for this class' : 'Select Subject'}
                </option>
                {classSubjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.subjectName} (Max: {sub.maxMarks})
                  </option>
                ))}
              </select>
            </div>
            {selectedSubject && (
              <div className="col-md-4 d-flex align-items-end">
                <div className="alert alert-info py-2 px-3 mb-0 w-100">
                  <small>
                    Max: <strong>{selectedSubject.maxMarks}</strong> | Pass: <strong>{selectedSubject.passingMarks}</strong>
                  </small>
                </div>
              </div>
            )}
          </div>

          {/* Marks entry table */}
          {loading ? (
            <LoadingSpinner />
          ) : !selectedSubjectId ? (
            <EmptyState message="Select an examination and subject to enter marks." />
          ) : entries.length === 0 ? (
            <EmptyState message="No students found in this class." />
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle app-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Student</th>
                    <th style={{ width: 140 }}>Marks</th>
                    <th style={{ width: 200 }}>Remarks</th>
                    <th style={{ width: 80 }}>Grade</th>
                    <th style={{ width: 90 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, index) => {
                    const marksNum = Number(entry.marks)
                    const isOverMax = selectedSubject && entry.marks !== '' && !isNaN(marksNum) && marksNum > selectedSubject.maxMarks
                    const isNeg = entry.marks !== '' && !isNaN(marksNum) && marksNum < 0

                    return (
                      <tr key={entry.studentId} className={entry.dirty ? 'table-warning' : ''}>
                        <td className="text-muted">{index + 1}</td>
                        <td className="fw-semibold">{entry.studentName}</td>
                        <td>
                          {canWrite ? (
                            <input
                              type="number"
                              className={`form-control form-control-sm${isOverMax || isNeg ? ' is-invalid' : ''}`}
                              value={entry.marks}
                              min={0}
                              max={selectedSubject?.maxMarks}
                              onChange={(e) => updateEntry(index, 'marks', e.target.value)}
                              placeholder="—"
                            />
                          ) : (
                            entry.existingResult ? entry.existingResult.marksObtained : '—'
                          )}
                        </td>
                        <td>
                          {canWrite ? (
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={entry.remarks}
                              onChange={(e) => updateEntry(index, 'remarks', e.target.value)}
                              placeholder="Optional"
                              maxLength={500}
                            />
                          ) : (
                            entry.existingResult?.remarks || '—'
                          )}
                        </td>
                        <td>
                          {entry.existingResult ? (
                            <span className="badge bg-secondary">{entry.existingResult.grade}</span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>
                          {entry.existingResult ? (
                            <StatusBadge status={entry.existingResult.status} />
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Summary footer */}
              <div className="d-flex justify-content-between align-items-center mt-2">
                <small className="text-muted">
                  {entries.length} students | {entries.filter((e) => e.existingResult).length} marks entered
                  {dirtyCount > 0 && <span className="text-warning ms-2">| {dirtyCount} unsaved changes</span>}
                </small>
                {canWrite && dirtyCount > 0 && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleSaveAll}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : `Save All (${dirtyCount})`}
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default EnterMarks
