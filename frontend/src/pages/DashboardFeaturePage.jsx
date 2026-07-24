import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import UserRecordsTable from "../components/UserRecordsTable";
import {
  getPasswordStrength,
  validateRegistrationForm,
} from "../utils/registrationValidation";

/** Real-world class label: "Grade 13 — 13 Commerce A (2026)" */
function formatClassOptionLabel(item) {
  const grade = item.gradeLevel ? `Grade ${item.gradeLevel}` : null;
  const name = item.className || "Class";
  const year = item.academicYear ? ` (${item.academicYear})` : "";
  return grade ? `${grade} — ${name}${year}` : `${name}${year}`;
}

/** Exam label includes grade from linked class */
function formatExamOptionLabel(item) {
  const subject = item.subject?.subjectName || "Subject";
  const className = item.class?.className || "Class";
  const grade = item.class?.gradeLevel ? `G${item.class.gradeLevel}` : null;
  const classPart = grade ? `${grade} ${className}` : className;
  return `${item.examName} — ${subject} (${classPart})`;
}

const featureConfigs = {
  "/admin/users/add": {
    title: "Add New Admin",
    description: "Create a new administrator account for the system.",
    registerForm: true,
    rolePreset: "admin",
    registerEndpoint: "/auth/register-admin",
    listEndpoint: "/users",
    listTitle: "Registered Admins",
    listType: "admin",
    listFilter: (row) => row.role === "admin",
  },
  "/admin/users/add-teacher": {
    title: "Add Teacher",
    description: "Create a teacher account and assign subject/class links.",
    registerForm: true,
    rolePreset: "teacher",
    listEndpoint: "/users/teachers",
    listTitle: "Registered Teachers",
    listType: "teacher",
  },
  "/admin/users/add-student": {
    title: "Add Student",
    description: "Create a student account and create the student profile.",
    registerForm: true,
    rolePreset: "student",
    listEndpoint: "/student-profiles",
    listTitle: "Registered Students",
    listType: "student",
  },
  "/admin/users/add-parent": {
    title: "Add Parent",
    description: "Create a parent account and link it with a student profile.",
    registerForm: true,
    rolePreset: "parent",
    listEndpoint: "/users",
    listTitle: "Registered Parents",
    listType: "user",
    listFilter: (row) => row.role === "parent",
  },
  "/admin/users": {
    title: "View Users",
    endpoint: "/users",
  },
  "/admin/users/edit-disable": {
    title: "Disable User",
    description: "Deactivate user accounts. Disabled users cannot log in.",
    endpoint: "/users",
    rowAction: "disableUser",
    tableColumns: ["fullName", "email", "role", "phoneNumber", "isActive"],
  },
  "/admin/users/teachers": {
    title: "Teachers",
    endpoint: "/users",
    filter: (row) => row.role === "teacher",
  },
  "/admin/users/students": {
    title: "Students",
    endpoint: "/users",
    filter: (row) => row.role === "student",
  },
  "/admin/users/parents": {
    title: "Parents",
    endpoint: "/users",
    filter: (row) => row.role === "parent",
  },
  "/admin/classes": {
    title: "Classes",
    description:
      "Create A/L classes with an explicit Grade 12 or Grade 13 level. This drives exam and student filtering.",
    endpoint: "/classes",
    tableColumns: [
      "gradeLevel",
      "className",
      "stream",
      "medium",
      "academicYear",
    ],
    form: {
      endpoint: "/classes",
      method: "post",
      submitLabel: "Create Class",
      fields: [
        {
          name: "gradeLevel",
          label: "Grade Level",
          type: "select",
          required: true,
          options: [
            { value: "12", label: "Grade 12" },
            { value: "13", label: "Grade 13" },
          ],
        },
        {
          name: "className",
          label: "Class Name",
          required: true,
          placeholder: "e.g. Commerce A or 12 Commerce A",
        },
        {
          name: "academicYear",
          label: "Academic Year",
          required: true,
          placeholder: "e.g. 2026",
        },
        {
          name: "assignedTeacher",
          label: "Assigned Teacher ID",
          placeholder: "Optional MongoDB User _id",
        },
      ],
    },
  },
  "/admin/subjects": {
    title: "Subjects",
    endpoint: "/subjects",
    form: {
      endpoint: "/subjects",
      method: "post",
      submitLabel: "Create Subject",
      fields: [
        { name: "subjectName", label: "Subject Name", required: true },
        { name: "subjectCode", label: "Subject Code", required: true },
      ],
    },
  },
  "/admin/teacher-assignments": {
    title: "Teacher Assignments",
    endpoint: "/subjects",
    description: "Review subject, class, and teacher assignment records.",
  },
  "/admin/exam-timetables": {
    title: "Exam Timetables",
    description:
      "Schedule exam dates, times, and rooms. Select class and subject by name — IDs are sent in the background. This is separate from marks exams.",
    endpoint: "/exam-timetables",
    tableColumns: [
      "examName",
      "class",
      "subject",
      "examDate",
      "startTime",
      "endTime",
      "location",
    ],
    form: {
      endpoint: "/exam-timetables",
      method: "post",
      submitLabel: "Create Timetable",
      fields: [
        {
          name: "examName",
          label: "Exam Name",
          required: true,
          placeholder: "e.g. Term Test 1 - Accounting",
        },
        {
          name: "classId",
          label: "Class",
          type: "async-select",
          required: true,
          placeholder: "Select class",
          optionsEndpoint: "/classes",
          optionValue: "_id",
          getOptionLabel: formatClassOptionLabel,
        },
        {
          name: "subjectId",
          label: "Subject",
          type: "async-select",
          required: true,
          placeholder: "Select subject",
          optionsEndpoint: "/subjects",
          optionValue: "_id",
          getOptionLabel: (item) =>
            `${item.subjectName}${item.subjectCode ? ` (${item.subjectCode})` : ""}`,
        },
        {
          name: "examDate",
          label: "Exam Date",
          type: "date",
          required: true,
        },
        {
          name: "startTime",
          label: "Start Time",
          type: "time",
          required: true,
        },
        {
          name: "endTime",
          label: "End Time",
          type: "time",
          required: true,
        },
        {
          name: "location",
          label: "Location",
          placeholder: "e.g. Main Hall",
          defaultValue: "Main Hall",
        },
        {
          name: "instructions",
          label: "Instructions",
          type: "textarea",
          placeholder: "Optional instructions for students...",
        },
      ],
    },
  },
  "/admin/exams": {
    title: "Exams",
    description:
      "Create exams used for Marks Management, ranks, and Z-scores. Pick class and subject by name.",
    endpoint: "/exams",
    tableColumns: ["examName", "class", "subject", "examDate", "totalMarks"],
    form: {
      endpoint: "/exams",
      method: "post",
      submitLabel: "Create Exam",
      fields: [
        {
          name: "examName",
          label: "Exam Name",
          required: true,
          placeholder: "e.g. Term Test 1 - Accounting",
        },
        {
          name: "classId",
          label: "Class",
          type: "async-select",
          required: true,
          placeholder: "Select class",
          optionsEndpoint: "/classes",
          optionValue: "_id",
          getOptionLabel: formatClassOptionLabel,
        },
        {
          name: "subjectId",
          label: "Subject",
          type: "async-select",
          required: true,
          placeholder: "Select subject",
          optionsEndpoint: "/subjects",
          optionValue: "_id",
          getOptionLabel: (item) =>
            `${item.subjectName}${item.subjectCode ? ` (${item.subjectCode})` : ""}`,
        },
        {
          name: "examDate",
          label: "Exam Date",
          type: "date",
          required: true,
        },
        {
          name: "totalMarks",
          label: "Total Marks",
          type: "number",
          defaultValue: 100,
          placeholder: "100",
        },
      ],
    },
  },
  "/teacher/exams": {
    title: "Create Exam",
    description:
      "Create an exam for Marks Management. After creating, enter student marks from Marks Management.",
    endpoint: "/exams",
    tableColumns: ["examName", "class", "subject", "examDate", "totalMarks"],
    form: {
      endpoint: "/exams",
      method: "post",
      submitLabel: "Create Exam",
      fields: [
        {
          name: "examName",
          label: "Exam Name",
          required: true,
          placeholder: "e.g. Term Test 1 - Accounting",
        },
        {
          name: "classId",
          label: "Class",
          type: "async-select",
          required: true,
          placeholder: "Select class",
          optionsEndpoint: "/classes",
          optionValue: "_id",
          getOptionLabel: formatClassOptionLabel,
        },
        {
          name: "subjectId",
          label: "Subject",
          type: "async-select",
          required: true,
          placeholder: "Select subject",
          optionsEndpoint: "/subjects",
          optionValue: "_id",
          getOptionLabel: (item) =>
            `${item.subjectName}${item.subjectCode ? ` (${item.subjectCode})` : ""}`,
        },
        {
          name: "examDate",
          label: "Exam Date",
          type: "date",
          required: true,
        },
        {
          name: "totalMarks",
          label: "Total Marks",
          type: "number",
          defaultValue: 100,
          placeholder: "100",
        },
      ],
    },
  },
  "/admin/question-paper-details": {
    title: "Question Paper Details",
    endpoint: "/essays/questions",
  },
  "/admin/system-analytics": {
    title: "System Analytics",
    endpoint: "/results/analytics-summary",
    layout: "cards",
  },
  "/admin/audit-logs": {
    title: "Audit Logs",
    endpoint: "/audit-logs",
  },
  "/admin/database-backup": {
    title: "Database Backup",
    description:
      "Create a JSON snapshot of users, students, results, attendance, classes, exams, settings, and contact messages. Files are stored in backend/database-backups.",
    endpoint: "/backups",
    layout: "summary",
    summaryFields: [
      { label: "Backup files", path: "count" },
      { label: "Latest file", path: "latest.fileName" },
      { label: "Latest created", path: "latest.createdAt" },
      { label: "Note", path: "note" },
    ],
    action: {
      endpoint: "/backups",
      method: "post",
      label: "Run Database Backup",
    },
  },
  "/admin/contact-messages": {
    title: "Contact Messages",
    description: "Inquiries submitted from the public Contact page.",
    endpoint: "/contact",
  },
  "/admin/reports": {
    title: "Reports",
    description: "Trigger monthly progress report generation.",
    action: {
      endpoint: "/reports/monthly-generate-test",
      method: "post",
      label: "Generate Monthly Reports",
    },
  },
  "/admin/settings": {
    title: "Settings",
    description:
      "Configure school-wide settings. Pass mark is used for grades (S/F), pass rates, and weak-student risk checks.",
    endpoint: "/settings",
    layout: "summary",
    summaryFields: [
      { label: "School Name", path: "schoolName" },
      { label: "Academic Year", path: "academicYear" },
      { label: "Pass Mark", path: "passMark" },
      { label: "Support Email", path: "supportEmail" },
      { label: "Timezone", path: "timezone" },
    ],
    form: {
      endpoint: "/settings",
      method: "put",
      submitLabel: "Save Settings",
      loadEndpoint: "/settings",
      formTitle: "Update System Settings",
      formDescription:
        "Edit school details below. Pass mark changes apply to new results and analytics immediately.",
      fields: [
        {
          name: "schoolName",
          label: "School Name",
          required: true,
          placeholder: "e.g. EduTrack Smart Learning System",
        },
        {
          name: "academicYear",
          label: "Academic Year",
          required: true,
          placeholder: "e.g. 2026",
        },
        {
          name: "passMark",
          label: "Pass Mark",
          type: "number",
          required: true,
          defaultValue: 40,
          placeholder: "40",
        },
        {
          name: "supportEmail",
          label: "Support Email",
          type: "email",
          placeholder: "admin@edutrack.lk",
        },
        {
          name: "timezone",
          label: "Timezone",
          defaultValue: "Asia/Colombo",
          placeholder: "Asia/Colombo",
        },
      ],
    },
  },
  "/teacher/classes": {
    title: "My Classes",
    endpoint: "/classes",
  },
  "/teacher/subjects": {
    title: "My Subjects",
    endpoint: "/subjects",
  },
  "/teacher/create-paper": {
    title: "Create Paper",
    description:
      "Create a new essay question paper for Grade 12 or Grade 13 students. Select grade and subject by name.",
    endpoint: "/essays/questions",
    tableColumns: ["gradeLevel", "question", "subject", "maxMarks", "createdAt"],
    form: {
      endpoint: "/essays/questions",
      method: "post",
      submitLabel: "Create Paper",
      fields: [
        {
          name: "gradeLevel",
          label: "Grade Level",
          type: "select",
          required: true,
          options: [
            { value: "12", label: "Grade 12" },
            { value: "13", label: "Grade 13" },
          ],
        },
        {
          name: "subject",
          label: "Subject",
          type: "async-select",
          required: true,
          placeholder: "Select subject",
          optionsEndpoint: "/subjects",
          optionValue: "_id",
          getOptionLabel: (item) =>
            `${item.subjectName}${item.subjectCode ? ` (${item.subjectCode})` : ""}`,
        },
        {
          name: "question",
          label: "Question",
          type: "textarea",
          required: true,
          placeholder: "Type the essay question students will answer...",
        },
        {
          name: "maxMarks",
          label: "Max Marks",
          type: "number",
          defaultValue: 10,
          placeholder: "10",
        },
      ],
    },
  },
  "/teacher/question-bank": {
    title: "Question Bank",
    endpoint: "/essays/questions",
    tableColumns: ["gradeLevel", "question", "subject", "maxMarks", "createdAt"],
  },
  "/teacher/marking-schemes": {
    title: "Marking Schemes",
    description:
      "Create a marking scheme for an essay question. Select the paper by question text — the question ID is sent in the background.",
    endpoint: "/essays/questions",
    tableColumns: ["gradeLevel", "question", "subject", "maxMarks"],
    form: {
      endpoint: "/essays/marking-schemes",
      method: "post",
      submitLabel: "Create Marking Scheme",
      fields: [
        {
          name: "question",
          label: "Essay Paper",
          type: "async-select",
          required: true,
          placeholder: "Select essay question",
          optionsEndpoint: "/essays/questions",
          optionValue: "_id",
          getOptionLabel: (item) => {
            const text = item.question || "Untitled question";
            const short =
              text.length > 80 ? `${text.slice(0, 80)}...` : text;
            const subject = item.subject?.subjectName;
            const grade = item.gradeLevel ? `G${item.gradeLevel}` : null;
            const parts = [short];
            if (grade) parts.push(grade);
            if (subject) parts.push(subject);
            return parts.join(" — ");
          },
        },
        {
          name: "keywords",
          label: "Keywords",
          required: true,
          placeholder: "comma,separated,keywords",
          transform: "csv",
        },
        {
          name: "modelAnswer",
          label: "Model Answer",
          type: "textarea",
          placeholder: "Ideal answer used by AI / NLP grading...",
        },
      ],
    },
  },
  "/teacher/papers": {
    title: "My Papers",
    endpoint: "/essays/questions",
    tableColumns: ["gradeLevel", "question", "subject", "maxMarks", "createdAt"],
  },
  "/teacher/submissions": {
    title: "Student Submissions",
    endpoint: "/essays/submissions",
  },
  "/teacher/marks": {
    title: "Marks Management",
    description:
      "Select an exam and student by name, enter marks, then save. Grade and risk status are calculated automatically by the API.",
    endpoint: "/results",
    tableColumns: ["student", "exam", "marks", "grade", "rank", "zScore"],
    form: {
      endpoint: "/results",
      method: "post",
      submitLabel: "Add Result",
      fields: [
        {
          name: "exam",
          label: "Exam",
          type: "async-select",
          required: true,
          placeholder: "Select exam",
          optionsEndpoint: "/exams",
          optionValue: "_id",
          getOptionLabel: formatExamOptionLabel,
        },
        {
          name: "student",
          label: "Student",
          type: "async-select",
          required: true,
          placeholder: "Select student",
          optionsEndpoint: "/student-profiles",
          optionValue: "_id",
          dependsOn: "exam",
          filterBy: (item, values, asyncOptions) => {
            if (!values.exam) return true;

            const exams = asyncOptions["/exams"] || [];
            const selectedExam = exams.find(
              (exam) => String(exam._id) === String(values.exam)
            );

            if (!selectedExam) return true;

            const examClassId = selectedExam.class?._id || selectedExam.class;
            const studentClassId = item.class?._id || item.class;

            return String(studentClassId) === String(examClassId);
          },
          getOptionLabel: (item) => {
            const name = item.user?.fullName || "Student";
            const code = item.studentId || "No ID";
            return `${name} (${code})`;
          },
        },
        {
          name: "marks",
          label: "Marks",
          type: "number",
          required: true,
          placeholder: "e.g. 72",
        },
      ],
    },
  },
  "/teacher/attendance": {
    title: "Attendance Management",
    description:
      "Select a class and student by name, then mark Present or Absent. MongoDB IDs are sent in the background.",
    endpoint: "/classes",
    tableColumns: ["className", "stream", "medium", "academicYear"],
    form: {
      endpoint: "/attendance",
      method: "post",
      submitLabel: "Mark Attendance",
      fields: [
        {
          name: "classId",
          label: "Class",
          type: "async-select",
          required: true,
          placeholder: "Select class",
          optionsEndpoint: "/classes",
          optionValue: "_id",
          getOptionLabel: formatClassOptionLabel,
        },
        {
          name: "student",
          label: "Student",
          type: "async-select",
          required: true,
          placeholder: "Select student",
          optionsEndpoint: "/student-profiles",
          optionValue: "_id",
          dependsOn: "classId",
          filterBy: (item, values) => {
            if (!values.classId) return true;
            const studentClassId = item.class?._id || item.class;
            return String(studentClassId) === String(values.classId);
          },
          getOptionLabel: (item) => {
            const name = item.user?.fullName || "Student";
            const code = item.studentId || "No ID";
            return `${name} (${code})`;
          },
        },
        {
          name: "date",
          label: "Date",
          type: "date",
          required: true,
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: ["Present", "Absent"],
          required: true,
        },
      ],
    },
  },
  "/teacher/z-scores-rankings": {
    title: "Z-Scores & Rankings",
    endpoint: "/results",
  },
  "/teacher/weak-students": {
    title: "Weak Student Detection",
    endpoint: "/risk-notifications",
  },
  "/teacher/score-trends": {
    title: "Score Trends",
    endpoint: "/results/analytics-summary",
    layout: "cards",
  },
  "/teacher/content-provider": {
    title: "AI Content Provider",
    endpoint: "/content-recommendations",
    form: {
      endpoint: "/content-recommendations",
      method: "post",
      submitLabel: "Add Content",
      fields: [
        { name: "subject", label: "Subject ID", required: true },
        { name: "topic", label: "Topic", required: true },
        { name: "noteTitle", label: "Note Title", required: true },
        { name: "noteDescription", label: "Note Description", type: "textarea", required: true },
        { name: "videoLink", label: "Video Link" },
        {
          name: "difficultyLevel",
          label: "Difficulty",
          type: "select",
          options: ["Medium", "Easy", "Hard"],
        },
      ],
    },
  },
  "/teacher/reports": {
    title: "Reports",
    endpoint: "/results/analytics-summary",
    layout: "cards",
  },
  "/student/subjects": {
    title: "My Subjects",
    description: "Subjects assigned to your student profile.",
    endpoint: "/student-dashboard",
    dataPath: "student.subjects",
    layout: "grid",
    cardTitleKey: "subjectName",
    cardDescriptionKey: "subjectCode",
  },
  "/student/exam-papers": {
    title: "Exam Papers",
    description: "Available essay questions for practice and submission.",
    endpoint: "/essays/questions",
    tableColumns: ["question", "maxMarks", "createdAt"],
  },
  "/student/adaptive-learning": {
    title: "Adaptive Learning",
    description: "Personalized recommendations for weaker subjects.",
    endpoint: "/adaptive-learning",
    dataPath: "adaptivePlan",
    tableColumns: ["subject", "marks", "recommendation"],
    emptyMessage: (response) =>
      !response?.hasExamResults
        ? "Recommendations will appear after your first examination."
        : "No weak subjects detected. Great job!",
  },
  "/student/performance": {
    title: "Performance Tracker",
    description: "Your examination marks, grades, and rankings.",
    endpoint: "/student-dashboard",
    dataPath: "results",
    tableColumns: ["exam", "marks", "grade", "rank", "zScore"],
    emptyMessage: "No academic performance data available.",
    emptyIcon: "📊",
  },
  "/student/revision-timetable": {
    title: "Revision Timetable",
    description: "Upcoming exam revision plan based on your performance.",
    endpoint: "/study-planner/revision-timetable",
    dataPath: "timetable",
    tableColumns: [
      "examName",
      "subject",
      "examDate",
      "daysRemaining",
      "priority",
      "dailyStudyHours",
      "recommendation",
    ],
  },
  "/student/badges": {
    title: "Achievement Badges",
    description: "Badges earned from attendance, marks, and learning progress.",
    endpoint: "/badges/student",
    layout: "grid",
    dataPath: "badges",
    cardTitleKey: "title",
    cardDescriptionKey: "description",
    cardMetaKey: "icon",
    emptyMessage:
      "Complete exams and maintain high performance to earn badges.",
  },
  "/student/flashcards": {
    title: "Flashcards",
    description: "Practice questions for active recall revision.",
    endpoint: "/flashcards",
    tableColumns: ["topic", "question", "answer", "difficulty"],
    emptyMessage:
      "Flashcards will appear after your teacher uploads learning materials.",
  },
  "/student/attendance-vs-marks": {
    title: "Attendance vs Marks",
    description: "How your attendance relates to your average marks.",
    endpoint: "/analytics/attendance-marks",
    tableColumns: ["studentId", "attendance", "averageMarks"],
    emptyMessage:
      "Complete at least one examination to view attendance and marks data.",
  },
  "/student/study-materials": {
    title: "Study Materials",
    description: "Recommended notes, topics, and learning resources.",
    endpoint: "/content-recommendations",
    tableColumns: ["noteTitle", "topic", "difficultyLevel", "noteDescription"],
    emptyMessage:
      "AI recommendations will be generated after sufficient academic data is available.",
  },
  "/student/change-password": {
    title: "Change Password",
    description: "Update your account password securely.",
    form: {
      endpoint: "/auth/change-password",
      method: "put",
      submitLabel: "Update Password",
      fields: [
        {
          name: "currentPassword",
          label: "Current Password",
          type: "password",
          required: true,
        },
        {
          name: "newPassword",
          label: "New Password",
          type: "password",
          required: true,
        },
        {
          name: "confirmPassword",
          label: "Confirm New Password",
          type: "password",
          required: true,
        },
      ],
    },
  },
  "/parent/child-overview": {
    title: "Child Overview",
    endpoint: "/parent-dashboard",
    dataPath: "student",
  },
  "/parent/marks-rankings": {
    title: "Marks & Rankings",
    endpoint: "/parent-dashboard",
    dataPath: "results",
  },
  "/parent/monthly-performance": {
    title: "Monthly Performance",
    endpoint: "/parent-dashboard",
    dataPath: "monthlyPerformance",
  },
  "/parent/attendance": {
    title: "Attendance",
    endpoint: "/parent-dashboard",
    dataPath: "attendanceRecords",
  },
  "/parent/risk-alerts": {
    title: "Risk Alerts",
    endpoint: "/risk-notifications",
  },
  "/parent/attendance-vs-grades": {
    title: "Attendance vs Grades",
    endpoint: "/analytics/attendance-grades",
    tableColumns: ["period", "attendance", "averageMarks", "grade"],
    emptyMessage:
      "More attendance and examination records are required to calculate the correlation.",
  },
  "/parent/progress-reports": {
    title: "Progress Reports",
    description: "Download the latest progress report PDF.",
    action: {
      endpoint: "/reports/student-report",
      method: "get",
      label: "Download Progress Report",
      responseType: "blob",
      downloadName: "student-progress-report.pdf",
    },
  },
};

function DashboardFeaturePage() {
  const { pathname } = useLocation();
  const { token, user } = useAuth();

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const config = getFeatureConfig(pathname, user);
  const displayData = config.profileData || getValueByPath(data, config.dataPath);
  const resolvedEmptyMessage = resolveEmptyMessage(config, data);

  const rows = useMemo(() => {
    const normalized = normalizeData(displayData);
    return config.filter ? normalized.filter(config.filter) : normalized;
  }, [config, displayData]);

  useEffect(() => {
    const fetchData = async () => {
      if (!config.endpoint || config.profileData) return;

      try {
        setLoading(true);
        setError("");

        const res = await api.get(config.endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setData(res.data);
      } catch (fetchError) {
        setError(
          fetchError.response?.data?.message ||
            fetchError.message ||
            "Failed to load data"
        );
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [config.endpoint, config.profileData, refreshKey, token]);

  const runAction = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const res = await api.request({
        url: config.action.endpoint,
        method: config.action.method,
        responseType: config.action.responseType,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (config.action.responseType === "blob") {
        downloadBlob(res.data, config.action.downloadName);
        setMessage("Download started successfully.");
      } else {
        setMessage(res.data?.message || "Action completed successfully.");

        if (config.endpoint) {
          const refresh = await api.get(config.endpoint, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setData(refresh.data);
        } else {
          setData(res.data);
        }
      }
    } catch (actionError) {
      setError(
        actionError.response?.data?.message ||
          actionError.message ||
          "Action failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        role={user?.role}
        title={config.title}
        description={config.description}
      />

      {config.form && (
        <FeatureForm
          form={config.form}
          token={token}
          onSaved={(savedMessage) => {
            setMessage(savedMessage);
            setRefreshKey((current) => current + 1);
          }}
          onError={setError}
        />
      )}

      {config.registerForm && (
        <RegisterUserForm
          rolePreset={config.rolePreset}
          registerEndpoint={config.registerEndpoint}
          token={token}
          onSaved={(savedMessage) => {
            setMessage(savedMessage);
            setRefreshKey((current) => current + 1);
          }}
          onError={setError}
        />
      )}

      {config.action && (
        <button
          type="button"
          onClick={runAction}
          disabled={loading}
          className="mb-6 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {loading ? "Working..." : config.action.label}
        </button>
      )}

      {message && <StatusMessage type="success" message={message} />}
      {error && <StatusMessage type="error" message={error} />}

      {config.listEndpoint && (
        <UserRecordsTable
          title={config.listTitle || "Records"}
          listEndpoint={config.listEndpoint}
          listType={config.listType || "user"}
          listFilter={config.listFilter}
          token={token}
          refreshKey={refreshKey}
          onSaved={(savedMessage) => {
            setMessage(savedMessage);
            setRefreshKey((current) => current + 1);
          }}
          onError={setError}
        />
      )}

      {loading && config.endpoint ? (
        <LoadingPanel />
      ) : config.layout === "summary" ? (
        <SummaryPanel data={displayData} fields={config.summaryFields || []} />
      ) : config.layout === "grid" ? (
        <GridCardPanel
          rows={rows}
          titleKey={config.cardTitleKey}
          descriptionKey={config.cardDescriptionKey}
          metaKey={config.cardMetaKey}
          emptyMessage={resolvedEmptyMessage}
          emptyIcon={config.emptyIcon}
        />
      ) : config.layout === "cards" ? (
        <CardPanel data={displayData} />
      ) : config.endpoint || config.profileData ? (
        <DataTable
          data={displayData}
          rows={rows}
          rowAction={config.rowAction}
          tableColumns={config.tableColumns}
          currentUserId={user?.id}
          token={token}
          emptyMessage={resolvedEmptyMessage}
          emptyIcon={config.emptyIcon}
          onSaved={(savedMessage) => {
            setMessage(savedMessage);
            setRefreshKey((current) => current + 1);
          }}
          onError={setError}
        />
      ) : config.form || config.registerForm || config.action ? null : (
        <EmptyState />
      )}
    </div>
  );
}

function PageHeader({ role, title, description }) {
  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
        {role || "Dashboard"} Workspace
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-950">
        {title}
      </h1>
      {description && (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          {description}
        </p>
      )}
    </div>
  );
}

function StatusMessage({ type, message }) {
  const styles =
    type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <div className={`mb-4 rounded-xl border p-4 text-sm font-semibold ${styles}`}>
      {message}
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-600">Loading data...</p>
    </div>
  );
}

function getInitialRegistrationValues(rolePreset) {
  return {
    fullName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    role: rolePreset || "teacher",
    status: "Active",
    teacherId: "",
    assignedSubject: "",
    assignedClass: "",
    studentId: "",
    className: "",
    academicYear: "",
    parent: "",
    parentId: "",
    childStudent: "",
    relationship: "",
  };
}

function getCreatingLabel(role) {
  if (role === "admin") return "Creating Admin...";
  if (role === "teacher") return "Creating Teacher...";
  if (role === "student") return "Creating Student...";
  if (role === "parent") return "Creating Parent...";
  return "Creating...";
}

function RegisterUserForm({
  rolePreset,
  registerEndpoint = "/auth/register",
  token,
  onSaved,
  onError,
}) {
  const [values, setValues] = useState(getInitialRegistrationValues(rolePreset));
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);

  const role = rolePreset || values.role;

  const academicYearOptions = useMemo(() => {
    const years = [
      ...new Set(classes.map((classItem) => classItem.academicYear).filter(Boolean)),
    ];

    if (years.length > 0) return years.sort();

    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1].map(String);
  }, [classes]);

  useEffect(() => {
    const loadRoleOptions = async () => {
      if (!token || (role !== "teacher" && role !== "student")) return;

      try {
        if (role === "teacher") {
          const [subjectsRes, classesRes] = await Promise.all([
            api.get("/subjects", {
              headers: { Authorization: `Bearer ${token}` },
            }),
            api.get("/classes", {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);

          setSubjects(subjectsRes.data || []);
          setClasses(classesRes.data || []);
          return;
        }

        const classesRes = await api.get("/classes", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setClasses(classesRes.data || []);
      } catch (loadError) {
        onError(loadError.response?.data?.message || "Failed to load class options");
      }
    };

    loadRoleOptions();
  }, [role, token, onError]);

  const updateValue = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }));

    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  const updateClassName = (className) => {
    const selectedClass = classes.find(
      (classItem) => classItem.className === className
    );

    setValues((current) => ({
      ...current,
      className,
      academicYear: selectedClass?.academicYear || current.academicYear,
    }));
  };

  const submitForm = async (event) => {
    event.preventDefault();

    const errors = validateRegistrationForm(values, role);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      onError("Please fix the highlighted fields and try again.");
      return;
    }

    try {
      setSaving(true);
      onError("");
      setFieldErrors({});

      const payload =
        role === "admin"
          ? {
              fullName: values.fullName.trim(),
              email: values.email.trim(),
              phoneNumber: values.phoneNumber.trim(),
              password: values.password,
              confirmPassword: values.confirmPassword,
              status: values.status,
            }
          : {
              ...values,
              fullName: values.fullName.trim(),
              email: values.email.trim(),
              phoneNumber: values.phoneNumber.trim(),
              role,
            };

      const res = await api.post(registerEndpoint, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      onSaved(res.data?.message || "User registered successfully.");
      setValues(getInitialRegistrationValues(rolePreset));
      setFieldErrors({});
    } catch (saveError) {
      const message =
        saveError.response?.data?.message ||
        saveError.message ||
        "User registration failed";

      if (message.toLowerCase().includes("email")) {
        setFieldErrors((current) => ({
          ...current,
          email: message,
        }));
      }

      onError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={submitForm}
      className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="mb-5 border-b border-slate-100 pb-4">
        <h2 className="text-xl font-semibold text-slate-950">Register User</h2>
        <p className="mt-1 text-sm text-slate-600">
          Create a secure account and assign role-specific academic details.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormTextField
          label="Full Name"
          name="fullName"
          value={values.fullName}
          onChange={updateValue}
          required
          error={fieldErrors.fullName}
        />
        <FormTextField
          label="Email"
          name="email"
          type="email"
          value={values.email}
          onChange={updateValue}
          required
          error={fieldErrors.email}
        />
        <FormTextField
          label="Phone Number"
          name="phoneNumber"
          value={values.phoneNumber}
          onChange={updateValue}
          placeholder="e.g. 0771234567"
          required
          error={fieldErrors.phoneNumber}
        />
        <PasswordField
          label="Temporary Password"
          name="password"
          value={values.password}
          onChange={updateValue}
          required
          error={fieldErrors.password}
          showStrength
        />
        <PasswordField
          label="Confirm Password"
          name="confirmPassword"
          value={values.confirmPassword}
          onChange={updateValue}
          required
          error={fieldErrors.confirmPassword}
        />

        {!rolePreset && (
          <SelectField
            label="Role"
            name="role"
            value={values.role}
            onChange={updateValue}
            options={["teacher", "student", "parent"]}
          />
        )}

        {rolePreset && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
            Role: {rolePreset}
          </div>
        )}

        <SelectField
          label="Status"
          name="status"
          value={values.status}
          onChange={updateValue}
          options={["Active", "Inactive"]}
        />

        {role === "teacher" && (
          <>
            <FormTextField
              label="Teacher ID"
              name="teacherId"
              value={values.teacherId}
              onChange={updateValue}
              required
              error={fieldErrors.teacherId}
            />
            <OptionSelectField
              label="Assigned Subject Code"
              name="assignedSubject"
              value={values.assignedSubject}
              onChange={updateValue}
              placeholder="Select subject"
              options={subjects.map((subject) => ({
                value: subject.subjectCode,
                label: `${subject.subjectCode} - ${subject.subjectName}`,
              }))}
            />
            <OptionSelectField
              label="Assigned Class Name"
              name="assignedClass"
              value={values.assignedClass}
              onChange={updateValue}
              placeholder="Select class"
              options={classes.map((classItem) => ({
                value: classItem.className,
                label: classItem.className,
              }))}
            />
          </>
        )}

        {role === "student" && (
          <>
            <FormTextField
              label="Student ID"
              name="studentId"
              value={values.studentId}
              onChange={updateValue}
              required
              error={fieldErrors.studentId}
            />
            <OptionSelectField
              label="Class Name"
              name="className"
              value={values.className}
              onChange={(_, value) => updateClassName(value)}
              placeholder="Select class"
              options={classes.map((classItem) => ({
                value: classItem.className,
                label: classItem.className,
              }))}
            />
            <OptionSelectField
              label="Academic Year"
              name="academicYear"
              value={values.academicYear}
              onChange={updateValue}
              placeholder="Select academic year"
              options={academicYearOptions.map((year) => ({
                value: year,
                label: year,
              }))}
            />
          </>
        )}

        {role === "parent" && (
          <>
            <FormTextField
              label="Parent ID"
              name="parentId"
              value={values.parentId}
              onChange={updateValue}
              required
              error={fieldErrors.parentId}
            />
            <FormTextField
              label="Child Student ID"
              name="childStudent"
              value={values.childStudent}
              onChange={updateValue}
              placeholder="e.g. COM2026001"
            />
            <FormTextField
              label="Relationship"
              name="relationship"
              value={values.relationship}
              onChange={updateValue}
              required
              error={fieldErrors.relationship}
            />
          </>
        )}
      </div>

      <button
        type="submit"
        disabled={saving}
        className="mt-5 rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {saving
          ? getCreatingLabel(role)
          : role === "admin"
          ? "Create Admin Account"
          : "Create Account"}
      </button>
    </form>
  );
}

function getFeatureFormInitialValues(fields) {
  return Object.fromEntries(
    fields.map((field) => {
      if (field.defaultValue !== undefined) {
        return [field.name, field.defaultValue];
      }

      if (field.type === "select" && field.options?.length) {
        const first = field.options[0];
        return [field.name, typeof first === "object" ? first.value : first];
      }

      if (field.type === "date") {
        return [field.name, new Date().toISOString().slice(0, 10)];
      }

      return [field.name, ""];
    })
  );
}

function getFieldSelectOptions(field, values, asyncOptions) {
  if (field.type === "async-select") {
    const items = asyncOptions[field.optionsEndpoint] || [];
    const filtered = field.filterBy
      ? items.filter((item) => field.filterBy(item, values, asyncOptions))
      : items;

    return filtered.map((item) => ({
      value: String(item[field.optionValue] || item._id || ""),
      label: field.getOptionLabel
        ? field.getOptionLabel(item)
        : String(item[field.optionValue] || item._id || ""),
    }));
  }

  if (!field.options) return [];

  return field.options.map((option) =>
    typeof option === "object"
      ? option
      : { value: option, label: option }
  );
}

function FeatureForm({ form, token, onSaved, onError }) {
  const initialValues = getFeatureFormInitialValues(form.fields);

  const [values, setValues] = useState(initialValues);
  const [asyncOptions, setAsyncOptions] = useState({});
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadExistingValues = async () => {
      if (!form.loadEndpoint || !token) return;

      try {
        setLoadingOptions(true);
        const res = await api.get(form.loadEndpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const record = res.data?.settings || res.data || {};
        const nextValues = { ...getFeatureFormInitialValues(form.fields) };

        form.fields.forEach((field) => {
          if (record[field.name] !== undefined && record[field.name] !== null) {
            nextValues[field.name] = record[field.name];
          }
        });

        setValues(nextValues);
      } catch (loadError) {
        onError(
          loadError.response?.data?.message ||
            loadError.message ||
            "Failed to load current settings"
        );
      } finally {
        setLoadingOptions(false);
      }
    };

    loadExistingValues();
  }, [form, token, onError]);

  useEffect(() => {
    const loadAsyncOptions = async () => {
      const endpoints = [
        ...new Set(
          form.fields
            .filter((field) => field.type === "async-select" && field.optionsEndpoint)
            .map((field) => field.optionsEndpoint)
        ),
      ];

      if (!endpoints.length || !token) return;

      try {
        setLoadingOptions(true);

        const responses = await Promise.all(
          endpoints.map((endpoint) =>
            api.get(endpoint, {
              headers: { Authorization: `Bearer ${token}` },
            })
          )
        );

        const nextOptions = {};
        endpoints.forEach((endpoint, index) => {
          nextOptions[endpoint] = normalizeData(responses[index].data);
        });

        setAsyncOptions(nextOptions);
      } catch (loadError) {
        onError(
          loadError.response?.data?.message ||
            loadError.message ||
            "Failed to load form options"
        );
      } finally {
        setLoadingOptions(false);
      }
    };

    loadAsyncOptions();
  }, [form.fields, token, onError]);

  const updateFieldValue = (fieldName, nextValue) => {
    setValues((current) => {
      const next = { ...current, [fieldName]: nextValue };

      // When parent dropdown changes, clear dependent child fields.
      form.fields.forEach((field) => {
        if (field.dependsOn === fieldName) {
          next[field.name] = "";
        }
      });

      return next;
    });
  };

  const submitForm = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      onError("");

      const payload = {};

      form.fields.forEach((field) => {
        const value = values[field.name];

        if (field.transform === "csv") {
          payload[field.name] = value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
          return;
        }

        if (field.type === "number") {
          if (value === "" || value === null || value === undefined) {
            if (field.defaultValue !== undefined) {
              payload[field.name] = Number(field.defaultValue);
            }
            return;
          }

          payload[field.name] = Number(value);
          return;
        }

        if (field.name === "gradeLevel") {
          payload[field.name] = Number(value);
          return;
        }

        payload[field.name] = value;
      });

      const res = await api.request({
        url: form.endpoint,
        method: form.method,
        data: payload,
        headers: { Authorization: `Bearer ${token}` },
      });

      onSaved(res.data?.message || "Saved successfully.");

      if (form.loadEndpoint) {
        const record = res.data?.settings || res.data || payload;
        const nextValues = { ...getFeatureFormInitialValues(form.fields) };
        form.fields.forEach((field) => {
          if (record[field.name] !== undefined && record[field.name] !== null) {
            nextValues[field.name] = record[field.name];
          }
        });
        setValues(nextValues);
      } else {
        setValues(getFeatureFormInitialValues(form.fields));
      }
    } catch (saveError) {
      onError(saveError.response?.data?.message || saveError.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={submitForm}
      className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="mb-5 border-b border-slate-100 pb-4">
        <h2 className="text-xl font-semibold text-slate-950">
          {form.formTitle || "Create Record"}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {loadingOptions
            ? "Loading form data..."
            : form.formDescription ||
              "Fill the required details and save the new record."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {form.fields.map((field) => {
          const selectOptions = getFieldSelectOptions(field, values, asyncOptions);
          const isSelect =
            field.type === "select" || field.type === "async-select";
          const dependsOnMissing =
            field.dependsOn && !values[field.dependsOn];

          return (
            <label key={field.name} className="text-sm font-bold text-slate-700">
              {field.label}
              {field.required && <span className="text-red-600"> *</span>}

              {isSelect ? (
                <select
                  value={values[field.name]}
                  required={field.required}
                  disabled={dependsOnMissing || loadingOptions}
                  onChange={(event) =>
                    updateFieldValue(field.name, event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm disabled:bg-slate-100"
                >
                  <option value="">
                    {dependsOnMissing
                      ? `Select ${field.dependsOn} first`
                      : field.placeholder || "Select option"}
                  </option>
                  {selectOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  value={values[field.name]}
                  required={field.required}
                  placeholder={field.placeholder}
                  onChange={(event) =>
                    updateFieldValue(field.name, event.target.value)
                  }
                  className="mt-1 min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm"
                />
              ) : (
                <input
                  type={field.type || "text"}
                  value={values[field.name]}
                  required={field.required}
                  placeholder={field.placeholder}
                  onChange={(event) =>
                    updateFieldValue(field.name, event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm"
                />
              )}
            </label>
          );
        })}
      </div>

      <button
        type="submit"
        disabled={saving || loadingOptions}
        className="mt-5 rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {saving ? "Saving..." : form.submitLabel}
      </button>
    </form>
  );
}

function FormTextField({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder = "",
  error = "",
}) {
  return (
    <label className="text-sm font-bold text-slate-700">
      {label}
      {required && <span className="text-red-600"> *</span>}
      <input
        type={type}
        name={name}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(name, event.target.value)}
        className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm shadow-sm ${
          error ? "border-red-400" : "border-slate-300"
        }`}
      />
      {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
    </label>
  );
}

function PasswordField({
  label,
  name,
  value,
  onChange,
  required = false,
  error = "",
  showStrength = false,
}) {
  const [visible, setVisible] = useState(false);
  const strength = getPasswordStrength(value);

  const strengthClass =
    strength.tone === "strong"
      ? "text-green-700"
      : strength.tone === "good"
      ? "text-blue-700"
      : strength.tone === "fair"
      ? "text-amber-700"
      : strength.tone === "weak"
      ? "text-red-600"
      : "text-slate-500";

  return (
    <label className="text-sm font-bold text-slate-700">
      {label}
      {required && <span className="text-red-600"> *</span>}
      <div className="relative mt-1">
        <input
          type={visible ? "text" : "password"}
          name={name}
          value={value}
          onChange={(event) => onChange(name, event.target.value)}
          className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm shadow-sm ${
            error ? "border-red-400" : "border-slate-300"
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-800"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>

      {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}

      {showStrength && value && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <p className={`font-semibold ${strengthClass}`}>
            Password strength: {strength.label || "Enter password"}
          </p>
          <ul className="mt-2 space-y-1">
            <li className={strength.checks.minLength ? "text-green-700" : ""}>
              {strength.checks.minLength ? "✓" : "•"} At least 8 characters
            </li>
            <li className={strength.checks.uppercase ? "text-green-700" : ""}>
              {strength.checks.uppercase ? "✓" : "•"} One uppercase letter
            </li>
            <li className={strength.checks.lowercase ? "text-green-700" : ""}>
              {strength.checks.lowercase ? "✓" : "•"} One lowercase letter
            </li>
            <li className={strength.checks.number ? "text-green-700" : ""}>
              {strength.checks.number ? "✓" : "•"} One number
            </li>
          </ul>
        </div>
      )}
    </label>
  );
}

function TextField({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
}) {
  return (
    <label className="text-sm font-bold text-slate-700">
      {label}
      <input
        type={type}
        name={name}
        value={value}
        required={required}
        onChange={(event) => onChange(name, event.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm"
      />
    </label>
  );
}

function OptionSelectField({
  label,
  name,
  value,
  onChange,
  options,
  placeholder = "Select option",
}) {
  return (
    <label className="text-sm font-bold text-slate-700">
      {label}
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SelectField({ label, name, value, onChange, options }) {
  return (
    <label className="text-sm font-bold text-slate-700">
      {label}
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function DataTable({
  data,
  rows,
  rowAction,
  tableColumns,
  currentUserId,
  token,
  emptyMessage,
  emptyIcon,
  onSaved,
  onError,
}) {
  const [actionUserId, setActionUserId] = useState(null);

  if (!data) return <EmptyState icon={emptyIcon} message={emptyMessage} />;

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        message={emptyMessage || "No records found."}
      />
    );
  }

  const columns = tableColumns || getColumns(rows);

  const disableUser = async (row) => {
    const userId = row._id || row.id;

    if (userId === currentUserId) {
      onError("You cannot disable your own account.");
      return;
    }

    const confirmed = window.confirm(
      `Disable ${row.fullName || row.email}? This user will not be able to log in.`
    );

    if (!confirmed) return;

    try {
      setActionUserId(userId);
      onError("");

      const res = await api.put(
        `/users/${userId}/disable`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      onSaved(res.data?.message || "User disabled successfully.");
    } catch (disableError) {
      onError(
        disableError.response?.data?.message ||
          disableError.message ||
          "Failed to disable user"
      );
    } finally {
      setActionUserId(null);
    }
  };

  const enableUser = async (row) => {
    const userId = row._id || row.id;

    const confirmed = window.confirm(
      `Enable ${row.fullName || row.email}? This user will be able to log in again.`
    );

    if (!confirmed) return;

    try {
      setActionUserId(userId);
      onError("");

      const res = await api.put(
        `/users/${userId}`,
        { status: "Active" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      onSaved(res.data?.message || "User enabled successfully.");
    } catch (enableError) {
      onError(
        enableError.response?.data?.message ||
          enableError.message ||
          "Failed to enable user"
      );
    } finally {
      setActionUserId(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              {columns.map((column) => (
                <th key={column} className="whitespace-nowrap p-3 font-semibold">
                  {formatLabel(column)}
                </th>
              ))}
              {rowAction && (
                <th className="whitespace-nowrap p-3 font-semibold">Action</th>
              )}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row._id || row.id || index}
                className="border-t border-slate-200 bg-white"
              >
                {columns.map((column) => (
                  <td
                    key={column}
                    className="max-w-sm p-3 align-top text-slate-700"
                  >
                    {formatCellValue(column, row[column])}
                  </td>
                ))}

                {rowAction === "disableUser" && (
                  <td className="p-3 align-top">
                    {row.isActive ? (
                      <button
                        type="button"
                        disabled={
                          actionUserId === (row._id || row.id) ||
                          (row._id || row.id) === currentUserId
                        }
                        onClick={() => disableUser(row)}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:bg-slate-300"
                      >
                        {actionUserId === (row._id || row.id)
                          ? "Disabling..."
                          : (row._id || row.id) === currentUserId
                          ? "Current User"
                          : "Disable"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={actionUserId === (row._id || row.id)}
                        onClick={() => enableUser(row)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:bg-slate-300"
                      >
                        {actionUserId === (row._id || row.id)
                          ? "Enabling..."
                          : "Enable"}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryPanel({ data, fields }) {
  if (!data || fields.length === 0) return <EmptyState />;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {fields.map((field) => {
        const rawValue = getValueByPath(data, field.path);
        const displayValue =
          rawValue === null || rawValue === undefined || rawValue === ""
            ? "N/A"
            : `${rawValue}${field.suffix || ""}`;

        return (
          <div
            key={field.label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {field.label}
            </p>
            <p className="typo-metric mt-3 text-slate-950">
              {displayValue}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function GridCardPanel({
  rows,
  titleKey,
  descriptionKey,
  metaKey,
  emptyMessage,
  emptyIcon,
}) {
  if (!rows.length) {
    return (
      <EmptyState
        icon={emptyIcon}
        message={emptyMessage || "No records found."}
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((row, index) => (
        <div
          key={row._id || row.id || index}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
        >
          {metaKey && row[metaKey] && (
            <p className="mb-2 text-3xl">{row[metaKey]}</p>
          )}
          <h3 className="text-xl font-semibold text-slate-950">
            {formatCellValue(titleKey, row[titleKey])}
          </h3>
          {descriptionKey && row[descriptionKey] && (
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {formatCellValue(descriptionKey, row[descriptionKey])}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function CardPanel({ data }) {
  const rows = normalizeData(data);
  const first = rows[0];

  if (!first) return <EmptyState />;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Object.entries(first)
        .filter(([key]) => key !== "__v" && key !== "_id")
        .slice(0, 12)
        .map(([key, value]) => (
          <div
            key={key}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {formatLabel(key)}
            </p>
            <p className="typo-metric mt-3 break-words text-slate-950">
              {formatValue(value)}
            </p>
          </div>
        ))}
    </div>
  );
}

function EmptyState({ message = "No data available yet.", icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      {icon && <div className="mb-2 text-3xl">{icon}</div>}
      <p className="text-sm font-semibold text-slate-600">{message}</p>
    </div>
  );
}

function resolveEmptyMessage(config, data) {
  if (typeof config.emptyMessage === "function") {
    return config.emptyMessage(data);
  }

  return config.emptyMessage;
}

function getFeatureConfig(pathname, user) {
  if (featureConfigs[pathname]) return featureConfigs[pathname];

  if (pathname.endsWith("/notifications")) {
    return user?.role === "student"
      ? {
          title: "Notifications",
          description: "Your current learning status and latest academic alerts.",
          endpoint: "/student-dashboard",
          layout: "summary",
          summaryFields: [
            { label: "Risk Status", path: "riskStatus" },
            { label: "Attendance", path: "attendancePercentage", suffix: "%" },
            { label: "Current Z-Score", path: "currentZScore" },
            { label: "Latest Exam", path: "latestResult.exam.examName" },
            { label: "Latest Marks", path: "latestResult.marks" },
            { label: "Latest Grade", path: "latestResult.grade" },
          ],
        }
      : {
          title: "Notifications",
          endpoint: "/risk-notifications",
          description: "Latest risk and dashboard notifications.",
        };
  }

  if (pathname.endsWith("/profile")) {
    return {
      title: "Profile",
      profileData: user,
      description: "Current logged-in account details.",
    };
  }

  return {
    title: "Dashboard Feature",
    description: "This section is ready for its own API integration.",
  };
}

function normalizeData(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];

  const arrayValue = Object.values(data).find((value) => Array.isArray(value));
  if (arrayValue) return arrayValue;

  return [data];
}

function getValueByPath(data, path) {
  if (!path) return data;
  return path.split(".").reduce((value, key) => value?.[key], data);
}

function getColumns(rows) {
  const priority = [
    "fullName",
    "email",
    "role",
    "className",
    "subjectName",
    "examName",
    "studentName",
    "marks",
    "grade",
    "rank",
    "zScore",
    "riskStatus",
    "attendancePercentage",
    "month",
    "averageMarks",
    "topic",
    "noteTitle",
    "question",
    "createdAt",
  ];

  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))].filter(
    (key) => !["__v", "password"].includes(key)
  );

  return [
    ...priority.filter((key) => keys.includes(key)),
    ...keys.filter((key) => !priority.includes(key)),
  ].slice(0, 9);
}

function formatCellValue(column, value) {
  if (column === "isActive") {
    return value ? "Active" : "Inactive";
  }

  if (column === "gradeLevel") {
    return value ? `Grade ${value}` : "N/A";
  }

  if (column === "rank") {
    const numericRank = Number(value);
    return numericRank > 0 ? numericRank : "N/A";
  }

  if (column === "marks" || column === "averageMarks" || column === "zScore") {
    if (value === null || value === undefined || value === "") return "N/A";
    return Number(value).toFixed(2);
  }

  if (column === "examDate" && value) {
    return new Date(value).toLocaleDateString();
  }

  return formatValue(value);
}

function formatLabel(label) {
  return label
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "N/A";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);

  if (typeof value === "string") {
    return value.length > 120 ? `${value.slice(0, 120)}...` : value;
  }

  if (Array.isArray(value)) {
    return value.map(formatValue).join(", ") || "N/A";
  }

  return (
    value.fullName ||
    value.user?.fullName ||
    value.email ||
    value.subjectName ||
    value.className ||
    value.examName ||
    value.studentName ||
    value.studentId ||
    value.noteTitle ||
    value.question ||
    value.fileName ||
    value.message ||
    JSON.stringify(value)
  );
}

function downloadBlob(blob, fileName) {
  const fileURL = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = fileURL;
  link.setAttribute("download", fileName);

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(fileURL);
}

export default DashboardFeaturePage;