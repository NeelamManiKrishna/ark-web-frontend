import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { previewPromotion, executePromotion } from '../api/promotionApi.ts'
import { useToast } from '../hooks/useToast.ts'
import type {
  PromotionPreviewResponse,
  PromotionExecuteResponse,
  PromotionCandidate,
  StudentOverride,
} from '../types/promotion.ts'
import StatusBadge from '../components/StatusBadge.tsx'
import Toast from '../components/Toast.tsx'
import { PROMOTION_ACTIONS } from '../constants/statuses.ts'

type Step = 'config' | 'preview' | 'results'

function Promotions() {
  const { organizationId, branchId, classId } = useParams<{
    organizationId: string
    branchId: string
    classId: string
  }>()
  const navigate = useNavigate()
  const { toast, showSuccess, showError, dismiss } = useToast()

  const [step, setStep] = useState<Step>('config')

  // Config step
  const [targetAcademicYear, setTargetAcademicYear] = useState('')
  const [targetSection, setTargetSection] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)

  // Preview step
  const [preview, setPreview] = useState<PromotionPreviewResponse | null>(null)
  const [overrides, setOverrides] = useState<Map<string, { action: string; reason: string }>>(new Map())
  const [executing, setExecuting] = useState(false)

  // Results step
  const [results, setResults] = useState<PromotionExecuteResponse | null>(null)

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organizationId || !branchId || !classId || !targetAcademicYear) {
      showError('Target academic year is required')
      return
    }
    setPreviewLoading(true)
    try {
      const data = await previewPromotion(organizationId, branchId, classId, targetAcademicYear)
      setPreview(data)
      setOverrides(new Map())
      setStep('preview')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to generate promotion preview')
    } finally {
      setPreviewLoading(false)
    }
  }

  const setOverride = (studentId: string, action: string, reason: string) => {
    setOverrides((prev) => {
      const next = new Map(prev)
      if (!action) {
        next.delete(studentId)
      } else {
        next.set(studentId, { action, reason })
      }
      return next
    })
  }

  const getEffectiveAction = (candidate: PromotionCandidate): string => {
    const override = overrides.get(candidate.studentId)
    if (override) return override.action
    return candidate.recommendation
  }

  const handleExecute = async () => {
    if (!organizationId || !branchId || !classId || !preview) return

    setExecuting(true)
    try {
      const studentOverrides: StudentOverride[] = []
      for (const [studentId, { action, reason }] of overrides) {
        studentOverrides.push({ studentId, action, reason: reason || undefined })
      }

      const data = await executePromotion(organizationId, branchId, {
        sourceClassId: classId,
        targetAcademicYear: preview.targetAcademicYear,
        targetSection: targetSection || undefined,
        studentOverrides: studentOverrides.length > 0 ? studentOverrides : undefined,
      })
      setResults(data)
      setStep('results')
      showSuccess('Promotions executed successfully')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to execute promotions')
    } finally {
      setExecuting(false)
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

      <h1 className="page-title mb-4">Student Promotions</h1>

      {/* Step Indicator */}
      <div className="d-flex gap-3 mb-4">
        {(['config', 'preview', 'results'] as Step[]).map((s, i) => (
          <span
            key={s}
            className={`badge fs-6 ${step === s ? 'bg-primary' : 'bg-secondary bg-opacity-25 text-dark'}`}
          >
            {i + 1}. {s === 'config' ? 'Configure' : s === 'preview' ? 'Preview & Override' : 'Results'}
          </span>
        ))}
      </div>

      {/* Step 1: Config */}
      {step === 'config' && (
        <div className="card">
          <div className="card-header">
            <h6 className="mb-0">Promotion Configuration</h6>
          </div>
          <div className="card-body">
            <form onSubmit={handlePreview}>
              <div className="row mb-3">
                <div className="col-md-6">
                  <label htmlFor="targetAcademicYear" className="form-label">
                    Target Academic Year <span className="text-danger">*</span>
                  </label>
                  <input
                    id="targetAcademicYear"
                    className="form-control"
                    value={targetAcademicYear}
                    onChange={(e) => setTargetAcademicYear(e.target.value)}
                    placeholder="e.g. 2026-2027"
                  />
                </div>
                <div className="col-md-6">
                  <label htmlFor="targetSection" className="form-label">Target Section (optional)</label>
                  <input
                    id="targetSection"
                    className="form-control"
                    value={targetSection}
                    onChange={(e) => setTargetSection(e.target.value)}
                    placeholder="e.g. A"
                  />
                </div>
              </div>
              <button className="btn btn-primary" type="submit" disabled={previewLoading}>
                {previewLoading ? 'Generating Preview...' : 'Preview Promotions'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && preview && (
        <>
          {/* Source info */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row">
                <div className="col-md-4">
                  <strong>Source Class:</strong> {preview.sourceClass.name} - {preview.sourceClass.section}
                  {' ('}{preview.sourceClass.academicYear}{')'}
                </div>
                <div className="col-md-4">
                  <strong>Target:</strong> {preview.targetClassName} ({preview.targetAcademicYear})
                </div>
                <div className="col-md-4">
                  {preview.terminalClass && (
                    <span className="badge bg-warning text-dark">Terminal Class — students will graduate</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Summary cards */}
          <div className="row g-3 mb-4">
            <div className="col-md-2">
              <div className="card text-center">
                <div className="card-body py-2">
                  <h4 className="mb-0">{preview.totalEligible}</h4>
                  <small className="text-muted">Total</small>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card text-center border-success">
                <div className="card-body py-2">
                  <h4 className="mb-0 text-success">{preview.totalRecommendedPromote}</h4>
                  <small className="text-muted">Promote</small>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card text-center border-primary">
                <div className="card-body py-2">
                  <h4 className="mb-0 text-primary">{preview.totalRecommendedGraduate}</h4>
                  <small className="text-muted">Graduate</small>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card text-center border-warning">
                <div className="card-body py-2">
                  <h4 className="mb-0 text-warning">{preview.totalRecommendedHoldBack}</h4>
                  <small className="text-muted">Hold Back</small>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card text-center border-secondary">
                <div className="card-body py-2">
                  <h4 className="mb-0 text-secondary">{preview.totalNoExamData}</h4>
                  <small className="text-muted">No Data</small>
                </div>
              </div>
            </div>
          </div>

          {/* Candidate table */}
          <div className="card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h6 className="mb-0">Candidates ({preview.candidates.length})</h6>
              {overrides.size > 0 && (
                <span className="badge bg-info">{overrides.size} override(s)</span>
              )}
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th>ARK ID</th>
                      <th>Name</th>
                      <th>Recommendation</th>
                      <th>Exam Summary</th>
                      <th>Failed Subjects</th>
                      <th>Override Action</th>
                      <th>Override Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.candidates.map((c) => {
                      const override = overrides.get(c.studentId)
                      const effective = getEffectiveAction(c)
                      return (
                        <tr
                          key={c.studentId}
                          className={override ? 'table-info' : c.hasFailingResults ? 'table-warning' : ''}
                        >
                          <td><code>{c.studentArkId}</code></td>
                          <td className="fw-semibold">{c.firstName} {c.lastName}</td>
                          <td>
                            <StatusBadge status={c.recommendation} />
                            {override && (
                              <span className="ms-1">
                                → <StatusBadge status={effective} />
                              </span>
                            )}
                          </td>
                          <td>
                            {c.hasExamData ? c.examSummary : <span className="text-muted">No data</span>}
                          </td>
                          <td>
                            {c.failedSubjects.length > 0 ? (
                              <span className="text-danger">{c.failedSubjects.join(', ')}</span>
                            ) : '—'}
                          </td>
                          <td>
                            <select
                              className="form-select form-select-sm"
                              aria-label={`Override action for ${c.firstName} ${c.lastName}`}
                              value={override?.action ?? ''}
                              onChange={(e) => setOverride(c.studentId, e.target.value, override?.reason ?? '')}
                            >
                              <option value="">— Use recommendation —</option>
                              {PROMOTION_ACTIONS.map((a) => (
                                <option key={a} value={a}>{a.replace('_', ' ')}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            {override && (
                              <input
                                className="form-control form-control-sm"
                                aria-label={`Override reason for ${c.firstName} ${c.lastName}`}
                                placeholder="Reason (optional)"
                                value={override.reason}
                                onChange={(e) => setOverride(c.studentId, override.action, e.target.value)}
                              />
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="d-flex gap-2">
            <button
              className="btn btn-secondary"
              onClick={() => { setStep('config'); setPreview(null) }}
            >
              Back to Config
            </button>
            <button
              className="btn btn-warning"
              onClick={handleExecute}
              disabled={executing}
            >
              {executing ? 'Executing...' : 'Execute Promotions'}
            </button>
          </div>
        </>
      )}

      {/* Step 3: Results */}
      {step === 'results' && results && (
        <>
          <div className="alert alert-success mb-4">
            Promotions executed successfully for <strong>{results.sourceClassName}</strong> → <strong>{results.targetClassName}</strong>
          </div>

          {/* Summary */}
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <div className="card text-center">
                <div className="card-body py-2">
                  <h4 className="mb-0">{results.summary.totalProcessed}</h4>
                  <small className="text-muted">Total Processed</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center border-success">
                <div className="card-body py-2">
                  <h4 className="mb-0 text-success">{results.summary.promoted}</h4>
                  <small className="text-muted">Promoted</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center border-primary">
                <div className="card-body py-2">
                  <h4 className="mb-0 text-primary">{results.summary.graduated}</h4>
                  <small className="text-muted">Graduated</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center border-warning">
                <div className="card-body py-2">
                  <h4 className="mb-0 text-warning">{results.summary.heldBack}</h4>
                  <small className="text-muted">Held Back</small>
                </div>
              </div>
            </div>
          </div>

          {/* Records table */}
          <div className="card mb-4">
            <div className="card-header">
              <h6 className="mb-0">Promotion Records</h6>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th>ARK ID</th>
                      <th>Name</th>
                      <th>Action</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.records.map((r) => (
                      <tr key={r.studentId}>
                        <td><code>{r.studentArkId}</code></td>
                        <td className="fw-semibold">{r.studentName}</td>
                        <td><StatusBadge status={r.promotionType} /></td>
                        <td>{r.reason || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => navigate(`/organizations/${organizationId}/branches/${branchId}/classes`)}
          >
            Back to Classes
          </button>
        </>
      )}
    </div>
  )
}

export default Promotions
