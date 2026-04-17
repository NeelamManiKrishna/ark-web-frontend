import { Fragment, useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getFacultyPerformance, getFacultyClassPerformance, getFacultySubjectPerformance } from '../api/facultyPerformanceApi.ts'
import { useToast } from '../hooks/useToast.ts'
import type {
  FacultyPerformanceResponse,
  FacultyClassPerformanceResponse,
  FacultySubjectPerformanceResponse,
  SubjectPerformance,
} from '../types/facultyPerformance.ts'
import Toast from '../components/Toast.tsx'
import LoadingSpinner from '../components/LoadingSpinner.tsx'
import EmptyState from '../components/EmptyState.tsx'

function FacultyPerformance() {
  const { organizationId, facultyId } = useParams<{
    organizationId: string
    facultyId: string
  }>()
  const navigate = useNavigate()
  const { toast, showError, dismiss } = useToast()

  const [performance, setPerformance] = useState<FacultyPerformanceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [academicYear, setAcademicYear] = useState('')

  // Drill-down state
  const [classDetail, setClassDetail] = useState<FacultyClassPerformanceResponse | null>(null)
  const [classDetailLoading, setClassDetailLoading] = useState(false)
  const [subjectDetail, setSubjectDetail] = useState<FacultySubjectPerformanceResponse | null>(null)
  const [subjectDetailLoading, setSubjectDetailLoading] = useState(false)

  // Expanded subject in the main table
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null)

  const fetchPerformance = useCallback(async () => {
    if (!organizationId || !facultyId) return
    setLoading(true)
    setError('')
    try {
      const data = await getFacultyPerformance(organizationId, facultyId, academicYear || undefined)
      setPerformance(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load performance data')
    } finally {
      setLoading(false)
    }
  }, [organizationId, facultyId, academicYear])

  useEffect(() => {
    fetchPerformance()
  }, [fetchPerformance])

  const handleClassDrillDown = (classId: string, className: string) => {
    if (!organizationId || !facultyId || !performance) return
    setClassDetailLoading(true)
    setClassDetail(null)
    setSubjectDetail(null)
    getFacultyClassPerformance(organizationId, facultyId, classId, performance.academicYear)
      .then((data) => setClassDetail(data))
      .catch((err) => showError(err instanceof Error ? err.message : `Failed to load detail for ${className}`))
      .finally(() => setClassDetailLoading(false))
  }

  const handleSubjectDrillDown = (subjectName: string) => {
    if (!organizationId || !facultyId) return
    setSubjectDetailLoading(true)
    setSubjectDetail(null)
    setClassDetail(null)
    getFacultySubjectPerformance(organizationId, facultyId, subjectName, performance?.academicYear)
      .then((data) => setSubjectDetail(data))
      .catch((err) => showError(err instanceof Error ? err.message : `Failed to load detail for ${subjectName}`))
      .finally(() => setSubjectDetailLoading(false))
  }

  const toggleSubject = (subject: SubjectPerformance) => {
    if (expandedSubject === subject.subjectName) {
      setExpandedSubject(null)
    } else {
      setExpandedSubject(subject.subjectName)
    }
  }

  const clearDrillDown = () => {
    setClassDetail(null)
    setSubjectDetail(null)
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
          <h1 className="page-title">Faculty Performance</h1>
          {performance && (
            <p className="text-muted mb-0">
              {performance.facultyName} ({performance.employeeId})
              {performance.academicYear && ` — ${performance.academicYear}`}
            </p>
          )}
        </div>
        <div style={{ width: 200 }}>
          <input
            className="form-control"
            placeholder="Academic Year (e.g. 2025-2026)"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <LoadingSpinner />
      ) : !performance ? (
        <EmptyState message="No performance data available." />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="row g-3 mb-4">
            <div className="col-md-4 col-lg-2">
              <div className="card text-center">
                <div className="card-body py-3">
                  <h3 className="mb-1">{performance.summary.totalClassesAssigned}</h3>
                  <small className="text-muted">Classes</small>
                </div>
              </div>
            </div>
            <div className="col-md-4 col-lg-2">
              <div className="card text-center">
                <div className="card-body py-3">
                  <h3 className="mb-1">{performance.summary.totalSubjectsTaught}</h3>
                  <small className="text-muted">Subjects</small>
                </div>
              </div>
            </div>
            <div className="col-md-4 col-lg-2">
              <div className="card text-center">
                <div className="card-body py-3">
                  <h3 className="mb-1">{performance.summary.totalStudentsTaught}</h3>
                  <small className="text-muted">Students</small>
                </div>
              </div>
            </div>
            <div className="col-md-4 col-lg-2">
              <div className="card text-center">
                <div className="card-body py-3">
                  <h3 className="mb-1">{performance.summary.overallAverageMarks.toFixed(1)}</h3>
                  <small className="text-muted">Avg Marks</small>
                </div>
              </div>
            </div>
            <div className="col-md-4 col-lg-2">
              <div className="card text-center">
                <div className="card-body py-3">
                  <h3 className="mb-1">{performance.summary.overallPassPercentage.toFixed(1)}%</h3>
                  <small className="text-muted">Pass Rate</small>
                </div>
              </div>
            </div>
            <div className="col-md-4 col-lg-2">
              <div className="card text-center">
                <div className="card-body py-3">
                  <h3 className="mb-1">{Object.keys(performance.summary.overallGradeDistribution).length}</h3>
                  <small className="text-muted">Grades</small>
                </div>
              </div>
            </div>
          </div>

          {/* Grade Distribution */}
          {Object.keys(performance.summary.overallGradeDistribution).length > 0 && (
            <div className="card mb-4">
              <div className="card-header">
                <h6 className="mb-0">Overall Grade Distribution</h6>
              </div>
              <div className="card-body">
                <div className="d-flex flex-wrap gap-3">
                  {Object.entries(performance.summary.overallGradeDistribution)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([grade, count]) => (
                      <div key={grade} className="text-center">
                        <span className="badge bg-primary fs-6 mb-1">{grade}</span>
                        <div className="small text-muted">{count} students</div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Class Teacher Info */}
          {performance.classTeacherOf && (
            <div className="card mb-4 border-info">
              <div className="card-header bg-info bg-opacity-10">
                <h6 className="mb-0">Class Teacher</h6>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-3">
                    <strong>Class:</strong> {performance.classTeacherOf.className}
                  </div>
                  <div className="col-md-3">
                    <strong>Students:</strong> {performance.classTeacherOf.studentsCount}
                  </div>
                  <div className="col-md-3">
                    <strong>Class Avg:</strong> {performance.classTeacherOf.classOverallAverage.toFixed(1)}
                  </div>
                  <div className="col-md-3">
                    <strong>Pass Rate:</strong> {performance.classTeacherOf.classPassPercentage.toFixed(1)}%
                  </div>
                </div>
                <button
                  className="btn btn-sm btn-outline-info mt-2"
                  onClick={() => handleClassDrillDown(performance.classTeacherOf!.classId, performance.classTeacherOf!.className)}
                >
                  View Detail
                </button>
              </div>
            </div>
          )}

          {/* Subject-wise Breakdown */}
          <div className="card mb-4">
            <div className="card-header">
              <h6 className="mb-0">Subject-wise Performance</h6>
            </div>
            <div className="card-body p-0">
              {performance.subjectWise.length === 0 ? (
                <p className="text-muted p-3 mb-0">No subject data available.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Classes</th>
                        <th>Students</th>
                        <th>Avg Marks</th>
                        <th>Pass Rate</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {performance.subjectWise.map((subject) => (
                        <Fragment key={subject.subjectName}>
                          <tr>
                            <td className="fw-semibold">{subject.subjectName}</td>
                            <td>{subject.classesCount}</td>
                            <td>{subject.totalStudents}</td>
                            <td>{subject.averageMarks.toFixed(1)}</td>
                            <td>{subject.passPercentage.toFixed(1)}%</td>
                            <td>
                              <button
                                className="btn btn-sm btn-outline-primary me-2"
                                onClick={() => toggleSubject(subject)}
                              >
                                {expandedSubject === subject.subjectName ? 'Collapse' : 'Expand'}
                              </button>
                              <button
                                className="btn btn-sm btn-outline-info"
                                onClick={() => handleSubjectDrillDown(subject.subjectName)}
                              >
                                Detail
                              </button>
                            </td>
                          </tr>
                          {expandedSubject === subject.subjectName && subject.classes.map((cls) => (
                            <tr key={`${subject.subjectName}-${cls.classId}`} className="table-light">
                              <td className="ps-4">{cls.className}</td>
                              <td>—</td>
                              <td>{cls.studentsCount}</td>
                              <td>{cls.averageMarks.toFixed(1)}</td>
                              <td>{cls.passPercentage.toFixed(1)}%</td>
                              <td>
                                <button
                                  className="btn btn-sm btn-outline-info"
                                  onClick={() => handleClassDrillDown(cls.classId, cls.className)}
                                >
                                  Detail
                                </button>
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Drill-down: Class Detail */}
          {(classDetail || classDetailLoading) && (
            <div className="card mb-4 border-primary">
              <div className="card-header bg-primary bg-opacity-10 d-flex justify-content-between align-items-center">
                <h6 className="mb-0">
                  Class Detail: {classDetail?.className ?? 'Loading...'}
                  {classDetail?.subjectName && ` — ${classDetail.subjectName}`}
                </h6>
                <button className="btn btn-sm btn-outline-secondary" onClick={clearDrillDown}>Close</button>
              </div>
              {classDetailLoading ? (
                <div className="card-body text-center">
                  <div className="spinner-border spinner-border-sm text-primary" />
                </div>
              ) : classDetail && (
                <div className="card-body">
                  <div className="row mb-3">
                    <div className="col-md-3"><strong>Students:</strong> {classDetail.studentsCount}</div>
                    <div className="col-md-3"><strong>Avg Marks:</strong> {classDetail.averageMarks.toFixed(1)}</div>
                    <div className="col-md-3"><strong>Highest:</strong> {classDetail.highestMarks.toFixed(1)}</div>
                    <div className="col-md-3"><strong>Lowest:</strong> {classDetail.lowestMarks.toFixed(1)}</div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-3"><strong>Pass Rate:</strong> {classDetail.passPercentage.toFixed(1)}%</div>
                    <div className="col-md-3"><strong>Type:</strong> {classDetail.assignmentType}</div>
                  </div>

                  {/* Grade distribution for class */}
                  {Object.keys(classDetail.gradeDistribution).length > 0 && (
                    <div className="mb-3">
                      <strong>Grade Distribution:</strong>
                      <div className="d-flex flex-wrap gap-2 mt-1">
                        {Object.entries(classDetail.gradeDistribution)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([grade, count]) => (
                            <span key={grade} className="badge bg-secondary">{grade}: {count}</span>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Exam-wise breakdown */}
                  {classDetail.examWise.length > 0 && (
                    <>
                      <h6 className="mt-3">Exam-wise Breakdown</h6>
                      <div className="table-responsive">
                        <table className="table table-sm align-middle">
                          <thead>
                            <tr>
                              <th>Exam</th>
                              <th>Type</th>
                              <th>Avg Marks</th>
                              <th>Pass Rate</th>
                              <th>Appeared</th>
                              <th>Absent</th>
                            </tr>
                          </thead>
                          <tbody>
                            {classDetail.examWise.map((exam) => (
                              <tr key={exam.examinationId}>
                                <td>{exam.examinationName}</td>
                                <td>{exam.examType}</td>
                                <td>{exam.averageMarks.toFixed(1)}</td>
                                <td>{exam.passPercentage.toFixed(1)}%</td>
                                <td>{exam.studentsAppeared}</td>
                                <td>{exam.studentsAbsent}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Drill-down: Subject Detail */}
          {(subjectDetail || subjectDetailLoading) && (
            <div className="card mb-4 border-success">
              <div className="card-header bg-success bg-opacity-10 d-flex justify-content-between align-items-center">
                <h6 className="mb-0">
                  Subject Detail: {subjectDetail?.subjectName ?? 'Loading...'}
                </h6>
                <button className="btn btn-sm btn-outline-secondary" onClick={clearDrillDown}>Close</button>
              </div>
              {subjectDetailLoading ? (
                <div className="card-body text-center">
                  <div className="spinner-border spinner-border-sm text-success" />
                </div>
              ) : subjectDetail && (
                <div className="card-body">
                  <div className="row mb-3">
                    <div className="col-md-3"><strong>Total Classes:</strong> {subjectDetail.totalClasses}</div>
                    <div className="col-md-3"><strong>Total Students:</strong> {subjectDetail.totalStudents}</div>
                    <div className="col-md-3"><strong>Overall Avg:</strong> {subjectDetail.overallAverage.toFixed(1)}</div>
                    <div className="col-md-3"><strong>Pass Rate:</strong> {subjectDetail.overallPassPercentage.toFixed(1)}%</div>
                  </div>

                  {subjectDetail.classBreakdown.length > 0 && (
                    <>
                      <h6 className="mt-3">Class Breakdown</h6>
                      <div className="table-responsive">
                        <table className="table table-sm align-middle">
                          <thead>
                            <tr>
                              <th>Class</th>
                              <th>Students</th>
                              <th>Avg Marks</th>
                              <th>Pass Rate</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subjectDetail.classBreakdown.map((cls) => (
                              <tr key={cls.classId}>
                                <td>{cls.className}</td>
                                <td>{cls.studentsCount}</td>
                                <td>{cls.averageMarks.toFixed(1)}</td>
                                <td>{cls.passPercentage.toFixed(1)}%</td>
                                <td>
                                  <button
                                    className="btn btn-sm btn-outline-info"
                                    onClick={() => handleClassDrillDown(cls.classId, cls.className)}
                                  >
                                    Detail
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default FacultyPerformance
