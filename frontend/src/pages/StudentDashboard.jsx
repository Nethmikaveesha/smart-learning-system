import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { formatMarks } from "../utils/formatters";

// Student shortcut actions shown on the dashboard.
const QUICK_ACTIONS = [
  { label: "My Subjects", to: "/student/subjects" },
  { label: "Exam Papers", to: "/student/exam-papers" },
  { label: "Submit Answers", to: "/student/essay-grader" },
  { label: "Ask AI", to: "/chatbot" },
  { label: "Start Revision", to: "/student/revision-timetable" },
];

// Some dashboard sections are optional.
// If one optional API fails, the main student dashboard should still load.
async function fetchOptional(apiCall, fallback) {
  try {
    return await apiCall();
  } catch (error) {
    console.warn("Optional dashboard section failed:", error.response?.data || error);
    return fallback;
  }
}

function StudentDashboard() {
  const { token } = useAuth();

  const [data, setData] = useState(null);
  const [adaptivePlan, setAdaptivePlan] = useState([]);
  const [contentRecommendations, setContentRecommendations] = useState([]);
  const [revisionTimetable, setRevisionTimetable] = useState([]);
  const [examTimetables, setExamTimetables] = useState([]);
  const [essayQuestions, setEssayQuestions] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setError("");
        const headers = { Authorization: `Bearer ${token}` };

        // Main dashboard data is required.
        const dashboardRes = await api.get("/student-dashboard", { headers });
        setData(dashboardRes.data);

        // These sections enrich the dashboard, but should not break the page.
        const [adaptiveRes, contentRes, revisionRes, timetableRes, papersRes] =
          await Promise.all([
            fetchOptional(() => api.get("/adaptive-learning", { headers }), {
              adaptivePlan: [],
            }),
            fetchOptional(() => api.get("/content-recommendations", { headers }), []),
            fetchOptional(
              () => api.get("/study-planner/revision-timetable", { headers }),
              { timetable: [] }
            ),
            fetchOptional(() => api.get("/exam-timetables", { headers }), []),
            fetchOptional(() => api.get("/essays/questions", { headers }), []),
          ]);

        setAdaptivePlan(adaptiveRes.adaptivePlan || []);
        setContentRecommendations(Array.isArray(contentRes) ? contentRes : []);
        setRevisionTimetable(revisionRes.timetable || []);
        setExamTimetables(Array.isArray(timetableRes) ? timetableRes : []);
        setEssayQuestions(Array.isArray(papersRes) ? papersRes : []);
      } catch (fetchError) {
        console.error(
          "Student Dashboard Error:",
          fetchError.response?.data || fetchError
        );

        setError(
          fetchError.response?.data?.message ||
            "Failed to load student dashboard"
        );
      }
    };

    if (token) fetchDashboard();
  }, [token]);

  const recentResults = useMemo(() => {
    if (!data?.results?.length) return [];

    return [...data.results]
      .sort(
        (left, right) =>
          new Date(right.createdAt || right.exam?.examDate || 0) -
          new Date(left.createdAt || left.exam?.examDate || 0)
      )
      .slice(0, 4);
  }, [data]);

  const subjectPerformance = useMemo(
    () => getSubjectPerformance(data?.results || [], data?.student?.subjects || []),
    [data]
  );

  const trendData = useMemo(
    () =>
      subjectPerformance.map((item) => ({
        subject: item.subject.split(" ")[0],
        marks: item.marks,
      })),
    [subjectPerformance]
  );

  const alerts = useMemo(
    () =>
      data
        ? buildAlerts({
            data,
            examTimetables,
            essayQuestions,
            adaptivePlan,
          })
        : [],
    [data, examTimetables, essayQuestions, adaptivePlan]
  );

  const upcomingActivities = useMemo(
    () =>
      buildUpcomingActivities(
        examTimetables,
        revisionTimetable,
        data?.student?.class?._id || data?.student?.class
      ),
    [examTimetables, revisionTimetable, data]
  );

  const recommendation = useMemo(
    () =>
      getRecommendedNextStep(
        adaptivePlan,
        contentRecommendations,
        hasExamResults(data)
      ),
    [adaptivePlan, contentRecommendations, data]
  );

  const studentFirstName =
    data?.student?.user?.fullName?.split(" ")[0] || "Student";

  const subjectList =
    data?.student?.subjects?.map((subject) => subject.subjectName).join(", ") ||
    "--";

  return (
    <div className="p-6">
      <DashboardHeader
        studentName={studentFirstName}
        studentId={data?.student?.studentId}
        className={data?.student?.class?.className}
        subjectList={subjectList}
      />

      {error ? (
        <AlertBox message={error} />
      ) : !data ? (
        <LoadingPanel />
      ) : (
        <>
          <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Attendance"
              value={formatSummaryValue(data.attendancePercentage, "percent")}
            />
            <MetricCard
              label="Current Z-Score"
              value={
                hasExamResults(data)
                  ? formatSummaryValue(data.currentZScore, "number")
                  : "--"
              }
            />
            <MetricCard
              label="Risk Status"
              value={
                hasExamResults(data) ? formatRiskStatus(data.riskStatus) : "--"
              }
              badgeClass={
                hasExamResults(data)
                  ? getRiskBadgeClass(formatRiskStatus(data.riskStatus))
                  : "bg-slate-100 text-slate-700"
              }
            />
            <MetricCard
              label="Latest Grade"
              value={
                hasExamResults(data)
                  ? formatSummaryValue(data.latestResult?.grade)
                  : "--"
              }
              badgeClass="bg-blue-100 text-blue-700"
            />
          </section>

          <Panel title="Important Alerts" description="Upcoming academic alerts and personal study reminders.">
            {alerts.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {alerts.map((alert, index) => (
                  <li
                    key={index}
                    className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-semibold text-amber-800"
                  >
                    {alert}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No new alerts"
                message="There are no urgent reminders at the moment."
              />
            )}
          </Panel>

          <div className="mb-6 grid gap-4 xl:grid-cols-2">
            <Panel
              title="Upcoming Activities"
              description="Upcoming exams, revision sessions, and deadlines."
            >
              {upcomingActivities.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="p-3 font-black">Activity</th>
                        <th className="p-3 font-black">Subject</th>
                        <th className="p-3 font-black">Date</th>
                      </tr>
                    </thead>

                    <tbody>
                      {upcomingActivities.map((item, index) => (
                        <tr
                          key={index}
                          className="border-t border-slate-200 bg-white"
                        >
                          <td className="p-3 font-semibold text-slate-800">
                            {item.activity}
                          </td>
                          <td className="p-3 text-slate-600">{item.subject}</td>
                          <td className="p-3 font-bold text-slate-900">
                            {formatShortDate(item.date)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="No upcoming activities"
                  message="No examinations or revision deadlines are scheduled right now."
                />
              )}

              <Link
                to="/student/revision-timetable"
                className="mt-4 inline-flex rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-blue-800"
              >
                View Full Timetable
              </Link>
            </Panel>

            <Panel
              title="Recent Performance"
              description="Latest subject marks from published results."
            >
              {subjectPerformance.length > 0 ? (
                <>
                  <div className="mb-4 space-y-2">
                    {subjectPerformance.map((item) => (
                      <div
                        key={item.subject}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                      >
                        <span className="font-bold text-slate-700">
                          {item.subject}
                        </span>
                        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
                          {item.marks}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="marks"
                          stroke="#2563eb"
                          strokeWidth={3}
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <EmptyState
                  title="No performance data"
                  message="Subject performance will appear after exam results are added."
                />
              )}

              <Link
                to="/student/performance"
                className="mt-4 inline-flex rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-700 transition hover:bg-blue-100"
              >
                View Performance Tracker
              </Link>
            </Panel>
          </div>

          <Panel
            title="Latest Results"
            description="Recently published examination results."
            action={
              <Link
                to="/student/performance"
                className="text-sm font-black text-blue-700 hover:underline"
              >
                View All Results
              </Link>
            }
          >
            <LatestResultsTable results={recentResults} />
          </Panel>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Recommended Next Step">
              {recommendation.available && recommendation.title ? (
                <>
                  <p className="text-base font-black text-slate-950">
                    {recommendation.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {recommendation.message}
                  </p>
                  <Link
                    to={recommendation.actionTo}
                    className="mt-4 inline-flex rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-blue-800"
                  >
                    {recommendation.actionLabel}
                  </Link>
                </>
              ) : (
                <EmptyState
                  title="Recommendations pending"
                  message={recommendation.message}
                />
              )}
            </Panel>

            <Panel title="Quick Actions">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {QUICK_ACTIONS.map((action) => (
                  <Link
                    key={action.to}
                    to={action.to}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-sm font-black text-slate-800 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

function DashboardHeader({ studentName, studentId, className, subjectList }) {
  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
          Student Dashboard
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
          Welcome back, {studentName}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Track your marks, attendance, revision tasks, alerts, and learning
          recommendations from one student workspace.
        </p>
      </div>

      <div className="mt-5 grid gap-3 text-sm md:grid-cols-3">
        <InfoStat label="Student ID" value={studentId || "--"} />
        <InfoStat label="Class" value={className || "--"} />
        <InfoStat label="Subjects" value={subjectList || "--"} />
      </div>
    </div>
  );
}

function MetricCard({ label, value, badgeClass }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>

      {badgeClass ? (
        <span
          className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-black ${badgeClass}`}
        >
          {value || "--"}
        </span>
      ) : (
        <h2 className="mt-3 truncate text-2xl font-black text-slate-950">
          {value || "--"}
        </h2>
      )}
    </div>
  );
}

function Panel({ title, description, children, action }) {
  return (
    <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-950">{title}</h2>
          {description && (
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function LatestResultsTable({ results }) {
  if (results.length === 0) {
    return (
      <EmptyState
        title="No examination results"
        message="Your latest results will appear after exams are marked."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-100 text-slate-700">
          <tr>
            <th className="p-3 font-black">Subject</th>
            <th className="p-3 font-black">Exam</th>
            <th className="p-3 font-black">Marks</th>
            <th className="p-3 font-black">Grade</th>
          </tr>
        </thead>

        <tbody>
          {results.map((result) => (
            <tr key={result._id} className="border-t border-slate-200 bg-white">
              <td className="p-3 font-semibold text-slate-800">
                {getSubjectName(result)}
              </td>
              <td className="p-3 text-slate-600">
                {result.exam?.examName || "--"}
              </td>
              <td className="p-3 font-black text-slate-950">
                {result.marks}
              </td>
              <td className="p-3">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                  {result.grade || "--"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InfoStat({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-bold text-slate-800">{value || "--"}</p>
    </div>
  );
}

function AlertBox({ message }) {
  return (
    <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
      {message}
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-600">
        Loading student dashboard...
      </p>
    </div>
  );
}

function EmptyState({ title, message }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-black text-slate-800">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">{message}</p>
    </div>
  );
}

function hasExamResults(data) {
  return Array.isArray(data?.results) && data.results.length > 0;
}

function formatSummaryValue(value, type = "text") {
  if (value === null || value === undefined || value === "") return "--";

  if (type === "percent") {
    const numericValue = Number(value);
    return numericValue > 0 ? `${formatMarks(numericValue)}%` : "--";
  }

  if (type === "number") {
    const numericValue = Number(value);
    return numericValue !== 0 ? formatMarks(numericValue) : "--";
  }

  return value || "--";
}

function formatRiskStatus(status) {
  if (!status) return "--";
  if (status === "Low") return "Low Risk";
  if (status === "Medium") return "Medium Risk";
  if (status === "High") return "High Risk";
  return status;
}

function getRiskBadgeClass(status) {
  const normalizedStatus = String(status || "").toLowerCase();

  if (normalizedStatus.includes("high")) {
    return "bg-red-100 text-red-700";
  }

  if (normalizedStatus.includes("medium")) {
    return "bg-amber-100 text-amber-700";
  }

  if (normalizedStatus.includes("low")) {
    return "bg-emerald-100 text-emerald-700";
  }

  return "bg-slate-100 text-slate-700";
}

function getSubjectName(result) {
  return (
    result.exam?.subject?.subjectName ||
    result.exam?.examName?.split(" - ").pop() ||
    "General"
  );
}

function formatShortDate(dateValue) {
  if (!dateValue) return "--";

  return new Date(dateValue).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function buildAlerts({ data, examTimetables, essayQuestions, adaptivePlan }) {
  const alerts = [];
  const classId = data?.student?.class?._id || data?.student?.class;

  const studentSubjectIds = new Set(
    (data?.student?.subjects || []).map((subject) => String(subject._id || subject))
  );

  const upcomingTimetables = examTimetables
    .filter((item) => {
      const matchesClass = String(item.class?._id || item.class) === String(classId);
      const matchesSubject = studentSubjectIds.has(
        String(item.subject?._id || item.subject)
      );

      return matchesClass && matchesSubject && new Date(item.examDate) >= new Date();
    })
    .sort((left, right) => new Date(left.examDate) - new Date(right.examDate));

  if (upcomingTimetables[0]) {
    const nextExam = upcomingTimetables[0];

    alerts.push(
      `${nextExam.subject?.subjectName || "Subject"} exam is scheduled for ${formatShortDate(nextExam.examDate)}.`
    );
  }

  const recentPapers = essayQuestions
    .filter((question) =>
      studentSubjectIds.has(String(question.subject?._id || question.subject))
    )
    .sort(
      (left, right) =>
        new Date(right.createdAt || 0) - new Date(left.createdAt || 0)
    );

  if (recentPapers[0]?.subject?.subjectName) {
    alerts.push(`A new ${recentPapers[0].subject.subjectName} paper is available.`);
  }

  if (
    Number(data?.attendancePercentage) > 0 &&
    Number(data.attendancePercentage) < 80
  ) {
    alerts.push("Your attendance is below 80%.");
  }

  if (adaptivePlan.length > 0) {
    alerts.push(`Additional revision is recommended for ${adaptivePlan[0].subject}.`);
  } else if (data?.riskStatus === "High" || data?.riskStatus === "Medium") {
    alerts.push(`Your risk status is currently ${formatRiskStatus(data.riskStatus)}.`);
  }

  return alerts;
}

function buildUpcomingActivities(examTimetables, revisionTimetable, classId) {
  const activities = [];

  const classTimetables = examTimetables
    .filter((item) => String(item.class?._id || item.class) === String(classId))
    .filter((item) => new Date(item.examDate) >= new Date())
    .sort((left, right) => new Date(left.examDate) - new Date(right.examDate));

  classTimetables.forEach((item) => {
    activities.push({
      activity: item.examName,
      subject: item.subject?.subjectName || "General",
      date: item.examDate,
    });
  });

  revisionTimetable.forEach((item) => {
    activities.push({
      activity: "Revision Session",
      subject: item.subject,
      date: item.examDate,
    });
  });

  const uniqueActivities = [];
  const seen = new Set();

  for (const item of activities) {
    const key = `${item.activity}-${item.subject}-${item.date}`;
    if (seen.has(key)) continue;

    seen.add(key);
    uniqueActivities.push(item);

    if (uniqueActivities.length === 3) break;
  }

  return uniqueActivities;
}

function getSubjectPerformance(results, subjects) {
  const latestBySubject = new Map();

  results.forEach((result) => {
    const subjectName = getSubjectName(result);

    if (!latestBySubject.has(subjectName)) {
      latestBySubject.set(subjectName, Number(result.marks) || 0);
    }
  });

  const orderedSubjects = (subjects || []).map((subject) => subject.subjectName);

  return orderedSubjects
    .filter((subjectName) => latestBySubject.has(subjectName))
    .slice(0, 3)
    .map((subjectName) => ({
      subject: subjectName,
      marks: latestBySubject.get(subjectName),
    }));
}

function getRecommendedNextStep(adaptivePlan, contentRecommendations, hasResults) {
  if (!hasResults) {
    return {
      available: false,
      message:
        "Recommendations will appear after sufficient academic data is available.",
    };
  }

  if (adaptivePlan.length > 0) {
    const weakSubject = adaptivePlan[0];

    const topic =
      weakSubject.notes?.[0]?.topic ||
      weakSubject.flashcards?.[0]?.topic ||
      contentRecommendations[0]?.topic ||
      "key topics";

    return {
      available: true,
      title: `Focus on ${topic}`,
      message: `Your recent ${weakSubject.subject} score is below your target.`,
      actionLabel: "Start Learning",
      actionTo: "/student/adaptive-learning",
    };
  }

  if (contentRecommendations.length > 0) {
    const recommendation = contentRecommendations[0];

    return {
      available: true,
      title: recommendation.noteTitle,
      message: recommendation.noteDescription,
      actionLabel: "Start Learning",
      actionTo: "/student/study-materials",
    };
  }

  return {
    available: true,
    title: "Keep up your revision routine",
    message: "You are performing well across your subjects.",
    actionLabel: "View Study Materials",
    actionTo: "/student/study-materials",
  };
}

export default StudentDashboard;