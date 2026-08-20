/** Mobile nav quick links — kept separate so sidebar files only export components. */

export const adminMobileLinks = [
  { label: "Dashboard", to: "/admin", end: true },
  { label: "Users", to: "/admin/users", end: true },
  { label: "Add Admin", to: "/admin/users/add", end: true },
  { label: "Classes", to: "/admin/classes" },
  { label: "Exams", to: "/admin/exams" },
  { label: "Analytics", to: "/admin/system-analytics" },
  { label: "Reports", to: "/admin/reports" },
];

export const teacherMobileLinks = [
  { label: "Dashboard", to: "/teacher", end: true },
  { label: "Classes", to: "/teacher/classes" },
  { label: "Papers", to: "/teacher/papers" },
  { label: "Create Exam", to: "/teacher/exams" },
  { label: "Submissions", to: "/teacher/submissions" },
  { label: "Analytics", to: "/teacher/topic-error-analysis" },
  { label: "Reports", to: "/teacher/reports" },
];

export const studentMobileLinks = [
  { label: "Dashboard", to: "/student", end: true },
  { label: "Subjects", to: "/student/subjects" },
  { label: "Papers", to: "/student/exam-papers" },
  { label: "Study Help", to: "/chatbot" },
  { label: "Progress", to: "/student/performance" },
  { label: "Risk Assessment", to: "/student/commerce-risk" },
  { label: "Materials", to: "/student/study-materials" },
];

export const parentMobileLinks = [
  { label: "Dashboard", to: "/parent", end: true },
  { label: "Overview", to: "/parent/child-overview" },
  { label: "Marks", to: "/parent/marks-rankings" },
  { label: "Attendance", to: "/parent/attendance" },
  { label: "Alerts", to: "/parent/risk-alerts" },
  { label: "Reports", to: "/parent/progress-reports" },
];
