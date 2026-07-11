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

const QUICK_ACTIONS = [
  { label: "My Subjects", to: "/student/subjects" },
  { label: "Exam Papers", to: "/student/exam-papers" },
  { label: "Submit Answers", to: "/student/essay-grader" },
  { label: "Ask AI", to: "/chatbot" },
  { label: "Start Revision", to: "/student/revision-timetable" },
];

async function fetchOptional(apiCall, fallback) {
  try {
    return await apiCall();
  } catch (error) {
    console.warn("Optional dashboard section failed:", error.response?.data || error);
    return fallback;
  }
}

function hasExamResults(data) {
  return Array.isArray(data?.results) && data.results.length > 0;
}

function formatSummaryValue(value, type = "text") {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

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
    (data?.student?.subjects || []).map((subject) =>
      String(subject._id || subject)
    )
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
    alerts.push(
      `A new ${recentPapers[0].subject.subjectName} paper is available.`
    );
  }

  if (
    Number(data?.attendancePercentage) > 0 &&
    Number(data.attendancePercentage) < 80
  ) {
    alerts.push("Your attendance is below 80%.");
  }

  if (adaptivePlan.length > 0) {
    alerts.push(
      `Additional revision is recommended for ${adaptivePlan[0].subject}.`
    );
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

  if (revisionTimetable[1]) {
    activities.push({
      activity: "Assignment",
      subject: revisionTimetable[1].subject,
      date: revisionTimetable[1].examDate,
    });
  }

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

        const dashboardRes = await api.get("/student-dashboard", { headers });
        setData(dashboardRes.data);

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

    if (token) {
      fetchDashboard();
    }
  }, [token]);

  const recentResults = useMemo(() => {
    if (!data?.results?.length) return [];

    return [...data.results]
      .sort(
        (left, right) =>
          new Date(right.createdAt || right.exam?.examDate || 0) -
          new Date(left.createdAt || left.exam?.examDate || 0)
      )
      .slice(0, 3);
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

  const studentName = data?.student?.user?.fullName?.split(" ")[0] || "Student";
  const subjectList =
    data?.student?.subjects?.map((subject) => subject.subjectName).join(", ") ||
    "--";

  return (
    <div className="p-6">
      <h1 className="mb-6 text-3xl font-bold text-slate-900">Student Dashboard</h1>

      {error ? (
        <div className="mb-6 rounded-lg bg-red-100 p-4 text-red-700">{error}</div>
      ) : !data ? (
        <p>Loading...</p>
      ) : (
        <>
          <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">
              Welcome back, {studentName}!
            </h2>
            <div className="mt-3 space-y-1 text-sm text-slate-600">
              <p>
                <span className="font-semibold text-slate-800">Student ID:</span>{" "}
                {data.student?.studentId || "--"}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Class:</span>{" "}
                {data.student?.class?.className || "--"}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Subjects:</span>{" "}
                {subjectList}
              </p>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Attendance"
              value={formatSummaryValue(data.attendancePercentage, "percent")}
            />
            <SummaryCard
              title="Current Z-Score"
              value={
                hasExamResults(data)
                  ? formatSummaryValue(data.currentZScore, "number")
                  : "--"
              }
            />
            <SummaryCard
              title="Risk Status"
              value={
                hasExamResults(data) ? formatRiskStatus(data.riskStatus) : "--"
              }
            />
            <SummaryCard
              title="Latest Grade"
              value={
                hasExamResults(data)
                  ? formatSummaryValue(data.latestResult?.grade)
                  : "--"
              }
            />
          </section>

          <Panel title="Important Alerts">
            {alerts.length > 0 ? (
              <ul className="space-y-2 text-sm text-slate-700">
                {alerts.map((alert, index) => (
                  <li key={index}>• {alert}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-600">No new alerts at the moment.</p>
            )}
          </Panel>

          <div className="mb-6 grid gap-4 xl:grid-cols-2">
            <Panel title="Upcoming Activities">
              {upcomingActivities.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="p-3 font-bold">Activity</th>
                        <th className="p-3 font-bold">Subject</th>
                        <th className="p-3 font-bold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {upcomingActivities.map((item, index) => (
                        <tr key={index} className="border-t border-slate-200">
                          <td className="p-3">{item.activity}</td>
                          <td className="p-3">{item.subject}</td>
                          <td className="p-3">{formatShortDate(item.date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-600">
                  No upcoming examinations or deadlines.
                </p>
              )}

              <Link
                to="/student/revision-timetable"
                className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                View Full Timetable
              </Link>
            </Panel>

            <Panel title="Recent Performance">
              {subjectPerformance.length > 0 ? (
                <>
                  <div className="mb-4 space-y-2">
                    {subjectPerformance.map((item) => (
                      <div
                        key={item.subject}
                        className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2 text-sm"
                      >
                        <span className="font-medium text-slate-800">
                          {item.subject}
                        </span>
                        <span className="font-bold text-slate-900">{item.marks}</span>
                      </div>
                    ))}
                  </div>

                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="marks"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <p className="text-sm text-slate-600">
                  No examination performance data available.
                </p>
              )}

              <Link
                to="/student/performance"
                className="mt-4 inline-flex rounded-lg border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                View Performance Tracker
              </Link>
            </Panel>
          </div>

          <Panel
            title="Latest Results"
            action={
              <Link
                to="/student/performance"
                className="text-sm font-semibold text-blue-700 hover:underline"
              >
                View All Results
              </Link>
            }
          >
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-3 font-bold">Subject</th>
                    <th className="p-3 font-bold">Exam</th>
                    <th className="p-3 font-bold">Marks</th>
                    <th className="p-3 font-bold">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {recentResults.length === 0 ? (
                    <tr className="border-t">
                      <td colSpan={4} className="p-4 text-center text-slate-500">
                        No examination results available.
                      </td>
                    </tr>
                  ) : (
                    recentResults.map((result) => (
                      <tr key={result._id} className="border-t border-slate-200">
                        <td className="p-3">{getSubjectName(result)}</td>
                        <td className="p-3">{result.exam?.examName || "--"}</td>
                        <td className="p-3">{result.marks}</td>
                        <td className="p-3">{result.grade || "--"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Recommended Next Step">
              {recommendation.available && recommendation.title ? (
                <>
                  <p className="text-base font-bold text-slate-900">
                    {recommendation.title}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {recommendation.message}
                  </p>
                  <Link
                    to={recommendation.actionTo}
                    className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    {recommendation.actionLabel}
                  </Link>
                </>
              ) : (
                <p className="text-sm text-slate-600">{recommendation.message}</p>
              )}
            </Panel>

            <Panel title="Quick Actions">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {QUICK_ACTIONS.map((action) => (
                  <Link
                    key={action.to}
                    to={action.to}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-800 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
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

function SummaryCard({ title, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <h2 className="mt-2 text-3xl font-bold text-slate-900">{value}</h2>
    </div>
  );
}

function Panel({ title, children, action }) {
  return (
    <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default StudentDashboard;
