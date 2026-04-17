export interface PerformanceSummary {
  totalClassesAssigned: number
  totalSubjectsTaught: number
  totalStudentsTaught: number
  overallAverageMarks: number
  overallPassPercentage: number
  overallGradeDistribution: Record<string, number>
}

export interface ClassPerformance {
  classId: string
  className: string
  studentsCount: number
  averageMarks: number
  passPercentage: number
  gradeDistribution: Record<string, number>
}

export interface SubjectPerformance {
  subjectName: string
  classesCount: number
  classes: ClassPerformance[]
  totalStudents: number
  averageMarks: number
  passPercentage: number
}

export interface ClassTeacherInfo {
  classId: string
  className: string
  studentsCount: number
  classOverallAverage: number
  classPassPercentage: number
}

export interface FacultyPerformanceResponse {
  facultyId: string
  facultyName: string
  employeeId: string
  academicYear: string
  summary: PerformanceSummary
  subjectWise: SubjectPerformance[]
  classTeacherOf: ClassTeacherInfo | null
}

export interface ExamBreakdown {
  examinationId: string
  examinationName: string
  examType: string
  averageMarks: number
  passPercentage: number
  studentsAppeared: number
  studentsAbsent: number
}

export interface FacultyClassPerformanceResponse {
  facultyId: string
  facultyName: string
  classId: string
  className: string
  academicYear: string
  subjectName: string
  assignmentType: string
  studentsCount: number
  averageMarks: number
  highestMarks: number
  lowestMarks: number
  passPercentage: number
  gradeDistribution: Record<string, number>
  examWise: ExamBreakdown[]
}

export interface ClassBreakdown {
  classId: string
  className: string
  studentsCount: number
  averageMarks: number
  passPercentage: number
}

export interface FacultySubjectPerformanceResponse {
  facultyId: string
  facultyName: string
  subjectName: string
  academicYear: string
  totalClasses: number
  totalStudents: number
  overallAverage: number
  overallPassPercentage: number
  classBreakdown: ClassBreakdown[]
}
