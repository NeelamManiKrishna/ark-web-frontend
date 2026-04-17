import { useState, useRef } from 'react'
import type { BulkImportResponse } from '../types/bulkImport.ts'
import { downloadSampleCsv } from '../api/bulkImportApi.ts'
import Modal from './Modal.tsx'

interface BulkImportModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  entityType: string // students, faculty, academic-classes, branches
  organizationId: string
  onImport: (file: File) => Promise<BulkImportResponse>
  onComplete?: () => void // callback to refresh parent list
}

function BulkImportModal({
  isOpen,
  onClose,
  title,
  entityType,
  organizationId,
  onImport,
  onComplete,
}: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<BulkImportResponse | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleClose = () => {
    setFile(null)
    setResult(null)
    setError('')
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    onClose()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null
    setFile(selected)
    setResult(null)
    setError('')
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError('')
    setResult(null)
    try {
      const res = await onImport(file)
      setResult(res)
      if (res.successCount > 0 && onComplete) {
        onComplete()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload CSV')
    } finally {
      setUploading(false)
    }
  }

  const handleDownloadSample = () => {
    downloadSampleCsv(organizationId, entityType)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={handleClose}>
            {result ? 'Done' : 'Cancel'}
          </button>
          {!result && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!file || uploading}
              onClick={handleUpload}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          )}
        </>
      }
    >
      {!result ? (
        <>
          <div className="mb-3">
            <label htmlFor="csvFile" className="form-label">Select CSV File</label>
            <input
              ref={fileInputRef}
              id="csvFile"
              type="file"
              className="form-control"
              accept=".csv"
              onChange={handleFileChange}
            />
            <div className="form-text">
              Maximum 10,000 rows per file. Max file size 5MB.
            </div>
          </div>

          <div className="mb-3">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={handleDownloadSample}
            >
              Download Sample CSV
            </button>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}
        </>
      ) : (
        <>
          {/* Result summary */}
          <div className="row g-3 mb-3">
            <div className="col-4">
              <div className="card text-center">
                <div className="card-body py-2">
                  <div className="fs-4 fw-bold">{result.totalRows}</div>
                  <small className="text-muted">Total Rows</small>
                </div>
              </div>
            </div>
            <div className="col-4">
              <div className="card text-center border-success">
                <div className="card-body py-2">
                  <div className="fs-4 fw-bold text-success">{result.successCount}</div>
                  <small className="text-muted">Imported</small>
                </div>
              </div>
            </div>
            <div className="col-4">
              <div className="card text-center border-danger">
                <div className="card-body py-2">
                  <div className="fs-4 fw-bold text-danger">{result.failureCount}</div>
                  <small className="text-muted">Failed</small>
                </div>
              </div>
            </div>
          </div>

          {result.failureCount === 0 && (
            <div className="alert alert-success mb-0">
              All {result.successCount} {result.entityType.toLowerCase()} records imported successfully.
            </div>
          )}

          {result.errors.length > 0 && (
            <>
              <h6 className="text-danger">Errors ({result.errors.length})</h6>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <table className="table table-sm table-bordered">
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>Row</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((err, i) => (
                      <tr key={i}>
                        <td className="fw-semibold">{err.row}</td>
                        <td className="text-danger small">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </Modal>
  )
}

export default BulkImportModal
