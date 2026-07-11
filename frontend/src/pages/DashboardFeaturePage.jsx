import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import UserRecordsTable from "../components/UserRecordsTable";
import {
  getPasswordStrength,
  validateRegistrationForm,
} from "../utils/registrationValidation";

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
    endpoint: "/classes",
    form: {
      endpoint: "/classes",
      method: "post",
      submitLabel: "Create Class",
      fields: [
        { name: "className", label: "Class Name", required: true },
        { name: "academicYear", label: "Academic Year", required: true },
        { name: "assignedTeacher", label: "Assigned Teacher ID" },
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
    endpoint: "/exam-timetables",
    form: {
      endpoint: "/exam-timetables",
      method: "post",
      submitLabel: "Create Timetable",
      fields: [
        { name: "examName", label: "Exam Name", required: true },
        { name: "classId", label: "Class ID", required: true },
        { name: "subjectId", label: "Subject ID", required: true },
        { name: "examDate", label: "Exam Date", type: "date", required: true },
        { name: "startTime", label: "Start Time", type: "time", required: true },
        { name: "endTime", label: "End Time", type: "time", required: true },
        { name: "location", label: "Location" },
        { name: "instructions", label: "Instructions" },
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
    description: "Generate a new JSON backup from the current database.",
    action: {
      endpoint: "/backups",
      method: "get",
      label: "Run Database Backup",
    },
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
    description: "Settings screen is ready for future system configuration APIs.",
  },
  "/teacher/classes": {
    title: "My Classes",
    endpoint: "/classes",
  },
  "/teacher/subjects": {
    title: "My Subjects",
    endpoint: "/subjects",
  },
  "/teacher/papers": {
    title: "My Papers",
    endpoint: "/essays/questions",
  },
  "/teacher/create-paper": {
    title: "Create Paper",
    description: "Create a new essay question paper for students.",
    form: {
      endpoint: "/essays/questions",
      method: "post",
      submitLabel: "Create Paper",
      fields: [
        { name: "subject", label: "Subject ID", required: true },
        { name: "question", label: "Question", type: "textarea", required: true },
        { name: "maxMarks", label: "Max Marks", type: "number" },
      ],
    },
  },
  "/teacher/question-bank": {
    title: "Question Bank",
    endpoint: "/essays/questions",
  },
  "/teacher/marking-schemes": {
    title: "Marking Schemes",
    description: "Create a marking scheme for an essay question.",
    form: {
      endpoint: "/essays/marking-schemes",
      method: "post",
      submitLabel: "Create Marking Scheme",
      fields: [
        { name: "question", label: "Question ID", required: true },
        {
          name: "keywords",
          label: "Keywords",
          required: true,
          placeholder: "comma,separated,keywords",
          transform: "csv",
        },
        { name: "modelAnswer", label: "Model Answer", type: "textarea" },
      ],
    },
  },
  "/teacher/submissions": {
    title: "Student Submissions",
    endpoint: "/essays/submissions",
  },
  "/teacher/marks": {
    title: "Marks Management",
    endpoint: "/results",
  },
  "/teacher/attendance": {
    title: "Attendance Management",
    endpoint: "/teacher-dashboard",
    layout: "cards",
    description: "Use class records and student IDs to mark attendance from the attendance API.",
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
        setData(res.data);
        setMessage(res.data?.message || "Action completed successfully.");
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
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          {user?.role} Dashboard
        </p>
        <h1 className="mt-1 text-3xl font-bold">{config.title}</h1>
        {config.description && (
          <p className="mt-2 max-w-3xl text-slate-600">{config.description}</p>
        )}
      </div>

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
          onClick={runAction}
          disabled={loading}
          className="mb-6 rounded-md bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-blue-300"
        >
          {loading ? "Working..." : config.action.label}
        </button>
      )}

      {message && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-4 text-green-700">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

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
        <p>Loading...</p>
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

function RegisterUserForm({ rolePreset, registerEndpoint = "/auth/register", token, onSaved, onError }) {
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

    if (years.length > 0) {
      return years.sort();
    }

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
        onError(
          loadError.response?.data?.message ||
            "Failed to load class options"
        );
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
      className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
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
          <div className="rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
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
        className="mt-5 rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:bg-slate-400"
      >
        {saving ? getCreatingLabel(role) : role === "admin" ? "Create Admin Account" : "Create Account"}
      </button>
    </form>
  );
}

function FeatureForm({ form, token, onSaved, onError }) {
  const initialValues = Object.fromEntries(
    form.fields.map((field) => [field.name, field.options?.[0] || ""])
  );
  const [values, setValues] = useState(initialValues);
  const [saving, setSaving] = useState(false);

  const submitForm = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      onError("");

      const payload = {};
      form.fields.forEach((field) => {
        const value = values[field.name];
        payload[field.name] =
          field.transform === "csv"
            ? value.split(",").map((item) => item.trim()).filter(Boolean)
            : value;
      });

      const res = await api.request({
        url: form.endpoint,
        method: form.method,
        data: payload,
        headers: { Authorization: `Bearer ${token}` },
      });

      onSaved(res.data?.message || "Saved successfully.");
      setValues(initialValues);
    } catch (saveError) {
      onError(
        saveError.response?.data?.message || saveError.message || "Save failed"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={submitForm}
      className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {form.fields.map((field) => (
          <label key={field.name} className="text-sm font-semibold text-slate-700">
            {field.label}
            {field.type === "select" ? (
              <select
                value={values[field.name]}
                required={field.required}
                onChange={(event) =>
                  setValues({ ...values, [field.name]: event.target.value })
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              >
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : field.type === "textarea" ? (
              <textarea
                value={values[field.name]}
                required={field.required}
                placeholder={field.placeholder}
                onChange={(event) =>
                  setValues({ ...values, [field.name]: event.target.value })
                }
                className="mt-1 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            ) : (
              <input
                type={field.type || "text"}
                value={values[field.name]}
                required={field.required}
                placeholder={field.placeholder}
                onChange={(event) =>
                  setValues({ ...values, [field.name]: event.target.value })
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            )}
          </label>
        ))}
      </div>

      <button
        type="submit"
        disabled={saving}
        className="mt-5 rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:bg-slate-400"
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
    <label className="text-sm font-semibold text-slate-700">
      {label}
      {required && <span className="text-red-600"> *</span>}
      <input
        type={type}
        name={name}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(name, event.target.value)}
        className={`mt-1 w-full rounded-md border px-3 py-2 ${
          error ? "border-red-400" : "border-slate-300"
        }`}
      />
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
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
    <label className="text-sm font-semibold text-slate-700">
      {label}
      {required && <span className="text-red-600"> *</span>}
      <div className="relative mt-1">
        <input
          type={visible ? "text" : "password"}
          name={name}
          value={value}
          onChange={(event) => onChange(name, event.target.value)}
          className={`w-full rounded-md border px-3 py-2 pr-10 ${
            error ? "border-red-400" : "border-slate-300"
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-800"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                d="M3 3l18 18M10.58 10.58A3 3 0 0012 15a3 3 0 002.42-4.42M9.88 5.09A10.94 10.94 0 0112 5c5.52 0 10.17 3.66 11 8.5a11.2 11.2 0 01-2.05 3.67M6.11 6.11A11.15 11.15 0 003 13.5C3.83 18.34 8.48 22 14 22c1.01 0 1.99-.13 2.91-.37"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                d="M2.04 12C2.84 7.16 7.48 3.5 12 3.5S21.16 7.16 22 12c-.8 4.84-5.44 8.5-10 8.5S2.84 16.84 2.04 12Z"
              />
              <circle cx="12" cy="12" r="3" strokeWidth="1.8" />
            </svg>
          )}
        </button>
      </div>
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
      {showStrength && value && (
        <div className="mt-2 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
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
    <label className="text-sm font-semibold text-slate-700">
      {label}
      <input
        type={type}
        name={name}
        value={value}
        required={required}
        onChange={(event) => onChange(name, event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
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
    <label className="text-sm font-semibold text-slate-700">
      {label}
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
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
    <label className="text-sm font-semibold text-slate-700">
      {label}
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
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
    return <EmptyState icon={emptyIcon} message={emptyMessage || "No records found."} />;
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
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              {columns.map((column) => (
                <th key={column} className="whitespace-nowrap p-3 font-bold">
                  {formatLabel(column)}
                </th>
              ))}
              {rowAction && <th className="whitespace-nowrap p-3 font-bold">Action</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row._id || row.id || index} className="border-t border-slate-200">
                {columns.map((column) => (
                  <td key={column} className="max-w-sm p-3 align-top text-slate-700">
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
                        className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-slate-300"
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
                        className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:bg-slate-300"
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
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-semibold text-slate-500">{field.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{displayValue}</p>
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
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          {metaKey && row[metaKey] && (
            <p className="mb-2 text-3xl">{row[metaKey]}</p>
          )}
          <h3 className="text-lg font-bold text-slate-900">
            {formatCellValue(titleKey, row[titleKey])}
          </h3>
          {descriptionKey && row[descriptionKey] && (
            <p className="mt-2 text-sm text-slate-600">
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
          <div key={key} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">{formatLabel(key)}</p>
            <p className="mt-2 break-words text-2xl font-bold text-slate-950">
              {formatValue(value)}
            </p>
          </div>
        ))}
    </div>
  );
}

function EmptyState({ message = "No data available yet.", icon }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-600 shadow-sm">
      {icon && <div className="mb-2 text-3xl">{icon}</div>}
      <p>{message}</p>
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
  if (typeof value === "string") return value.length > 120 ? `${value.slice(0, 120)}...` : value;
  if (Array.isArray(value)) return value.map(formatValue).join(", ") || "N/A";

  return (
    value.fullName ||
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
