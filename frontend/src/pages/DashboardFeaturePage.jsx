import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const featureConfigs = {
  "/admin/users/add": {
    title: "Add New User",
    description: "Select a role and complete the matching registration fields.",
    registerForm: true,
  },
  "/admin/users/add-teacher": {
    title: "Add Teacher",
    description: "Create a teacher account and assign subject/class links.",
    registerForm: true,
    rolePreset: "teacher",
  },
  "/admin/users/add-student": {
    title: "Add Student",
    description: "Create a student account and create the student profile.",
    registerForm: true,
    rolePreset: "student",
  },
  "/admin/users/add-parent": {
    title: "Add Parent",
    description: "Create a parent account and link it with a student profile.",
    registerForm: true,
    rolePreset: "parent",
  },
  "/admin/users": {
    title: "View Users",
    endpoint: "/users",
  },
  "/admin/users/edit-disable": {
    title: "Edit / Disable User",
    endpoint: "/users",
    rowAction: "disableUser",
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
  "/teacher/topic-error-analysis": {
    title: "Topic Error Analysis",
    endpoint: "/essays/topic-error-analytics",
    layout: "cards",
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
    endpoint: "/student-dashboard",
    dataPath: "student.subjects",
  },
  "/student/exam-papers": {
    title: "Exam Papers",
    endpoint: "/essays/questions",
  },
  "/student/adaptive-learning": {
    title: "Adaptive Learning",
    endpoint: "/adaptive-learning",
    dataPath: "adaptivePlan",
  },
  "/student/performance": {
    title: "Performance Tracker",
    endpoint: "/student-dashboard",
    dataPath: "results",
  },
  "/student/revision-timetable": {
    title: "Revision Timetable",
    endpoint: "/study-planner/revision-timetable",
    dataPath: "timetable",
  },
  "/student/badges": {
    title: "Achievement Badges",
    endpoint: "/badges/student",
    dataPath: "badges",
  },
  "/student/flashcards": {
    title: "Flashcards",
    endpoint: "/flashcards",
  },
  "/student/attendance-vs-marks": {
    title: "Attendance vs Marks",
    endpoint: "/analytics/attendance-marks",
  },
  "/student/study-materials": {
    title: "Study Materials",
    endpoint: "/content-recommendations",
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
        setMessage("");

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

      {loading && config.endpoint ? (
        <p>Loading...</p>
      ) : config.layout === "cards" ? (
        <CardPanel data={displayData} />
      ) : config.endpoint || config.profileData || data ? (
        <DataTable
          data={displayData}
          rows={rows}
          rowAction={config.rowAction}
          token={token}
          onSaved={(savedMessage) => {
            setMessage(savedMessage);
            setRefreshKey((current) => current + 1);
          }}
          onError={setError}
        />
      ) : (
        <EmptyState />
      )}
    </div>
  );
}

function RegisterUserForm({ rolePreset, token, onSaved, onError }) {
  const [values, setValues] = useState({
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
    classId: "",
    academicYear: "",
    parent: "",
    parentId: "",
    childStudent: "",
    relationship: "",
  });
  const [saving, setSaving] = useState(false);

  const role = rolePreset || values.role;

  const updateValue = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }));
  };

  const submitForm = async (event) => {
    event.preventDefault();

    if (values.password !== values.confirmPassword) {
      onError("Password and confirm password do not match");
      return;
    }

    try {
      setSaving(true);
      onError("");

      const payload = {
        ...values,
        role,
      };

      const res = await api.post("/auth/register", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      onSaved(res.data?.message || "User registered successfully.");
      setValues((current) => ({
        ...Object.fromEntries(Object.keys(current).map((key) => [key, ""])),
        role: rolePreset || "teacher",
        status: "Active",
      }));
    } catch (saveError) {
      onError(
        saveError.response?.data?.message ||
          saveError.message ||
          "User registration failed"
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
        <TextField label="Full Name" name="fullName" value={values.fullName} onChange={updateValue} required />
        <TextField label="Email" name="email" type="email" value={values.email} onChange={updateValue} required />
        <TextField label="Phone Number" name="phoneNumber" value={values.phoneNumber} onChange={updateValue} />
        <TextField label="Temporary Password" name="password" type="password" value={values.password} onChange={updateValue} required />
        <TextField label="Confirm Password" name="confirmPassword" type="password" value={values.confirmPassword} onChange={updateValue} required />

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
            <TextField label="Teacher ID" name="teacherId" value={values.teacherId} onChange={updateValue} required />
            <TextField label="Assigned Subject ID" name="assignedSubject" value={values.assignedSubject} onChange={updateValue} />
            <TextField label="Assigned Class ID" name="assignedClass" value={values.assignedClass} onChange={updateValue} />
          </>
        )}

        {role === "student" && (
          <>
            <TextField label="Student ID" name="studentId" value={values.studentId} onChange={updateValue} required />
            <TextField label="Class ID" name="classId" value={values.classId} onChange={updateValue} />
            <TextField label="Academic Year" name="academicYear" value={values.academicYear} onChange={updateValue} required />
          </>
        )}

        {role === "parent" && (
          <>
            <TextField label="Parent ID" name="parentId" value={values.parentId} onChange={updateValue} required />
            <TextField label="Child / Student Profile ID" name="childStudent" value={values.childStudent} onChange={updateValue} />
            <TextField label="Relationship" name="relationship" value={values.relationship} onChange={updateValue} required />
          </>
        )}
      </div>

      <button
        type="submit"
        disabled={saving}
        className="mt-5 rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:bg-slate-400"
      >
        {saving ? "Creating..." : "Create Account"}
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

function DataTable({ data, rows, rowAction, token, onSaved, onError }) {
  if (!data) return <EmptyState />;
  if (rows.length === 0) return <EmptyState message="No records found." />;

  const columns = getColumns(rows);

  const disableUser = async (userId) => {
    try {
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
                    {formatValue(row[column])}
                  </td>
                ))}
                {rowAction === "disableUser" && (
                  <td className="p-3 align-top">
                    <button
                      type="button"
                      disabled={!row.isActive}
                      onClick={() => disableUser(row._id || row.id)}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-slate-300"
                    >
                      {row.isActive ? "Disable" : "Inactive"}
                    </button>
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

function EmptyState({ message = "No data available yet." }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
      {message}
    </div>
  );
}

function getFeatureConfig(pathname, user) {
  if (featureConfigs[pathname]) return featureConfigs[pathname];

  if (pathname.endsWith("/notifications")) {
    return user?.role === "student"
      ? {
          title: "Notifications",
          endpoint: "/student-dashboard",
          layout: "cards",
          description: "Student dashboard alerts and learning status.",
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
