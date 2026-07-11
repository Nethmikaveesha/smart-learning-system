import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const CHART_COLORS = {
  primary: "#2563eb",
  secondary: "#16a34a",
};

const QUICK_ACTIONS = [
  { label: "Create Paper", to: "/teacher/create-paper" },
  { label: "Question Bank", to: "/teacher/question-bank" },
  { label: "Marking Schemes", to: "/teacher/marking-schemes" },
  { label: "Student Submissions", to: "/teacher/submissions" },
  { label: "Attendance", to: "/teacher/attendance" },
];

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "--";
  return value;
}

function getSubjectName(result) {
  return (
    result.exam?.subject?.subjectName ||
    result.exam?.examName?.split(" - ").pop() ||
    "General"
  );
}

function TeacherDashboard() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setError("");
        const res = await api.get("/teacher-dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data);
      } catch (fetchError) {
        setError(
          fetchError.response?.data?.message ||
            "Failed to load teacher dashboard"
        );
      }
    };

    if (token) fetchDashboard();
  }, [token]);

  const classLabel = data?.classes?.join(", ") || "--";
  const subjectLabel = data?.subjects?.join(", ") || "--";
  const topicSummary = data?.topicErrorSummary;
  const previewChartData =
    topicSummary?.previewWeakTopics?.map((item) => ({
      name: item.label,
      count: item.count,
    })) || [];

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Teacher Dashboard</h1>
          {data && (
            <div className="mt-2 space-y-1 text-sm text-slate-600">
              <p>
                Welcome back,{" "}
                <span className="font-semibold text-slate-800">
                  {data.teacher?.fullName || "Teacher"}
                </span>
              </p>
              <p>
                <span className="font-semibold text-slate-800">Class:</span>{" "}
                {classLabel}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Subjects:</span>{" "}
                {subjectLabel}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/teacher/create-paper"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Create Paper
          </Link>
          <Link
            to="/teacher/submissions"
            className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
          >
            Mark Submissions
          </Link>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-lg bg-red-100 p-4 text-red-700">{error}</div>
      ) : !data ? (
        <p>Loading...</p>
      ) : (
        <>
          <section className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard title="Total Students" value={formatValue(data.totalStudents)} />
            <SummaryCard
              title="Pending Submissions"
              value={formatValue(data.pendingSubmissions)}
            />
            <SummaryCard
              title="Average Marks"
              value={data.averageMarks ? data.averageMarks : "--"}
            />
            <SummaryCard
              title="High-Risk Students"
              value={formatValue(data.highRiskStudents)}
            />
          </section>

          <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <SecondaryCard title="Total Exams" value={formatValue(data.totalExams)} />
            <SecondaryCard
              title="Pass Rate"
              value={data.passRate ? `${data.passRate}%` : "--"}
              hint={
                data.totalPublishedResults
                  ? `Based on ${data.totalPublishedResults} published results`
                  : ""
              }
            />
            <SecondaryCard
              title="Attendance Rate"
              value={
                data.averageAttendance ? `${data.averageAttendance}%` : "--"
              }
            />
            <SecondaryCard
              title="Ungraded Essays"
              value={formatValue(data.ungradedEssays)}
            />
          </section>

          <div className="mb-6 grid gap-4 xl:grid-cols-2">
            <Panel title="Teacher Alerts">
              {data.alerts?.length > 0 ? (
                <ul className="space-y-2 text-sm text-slate-700">
                  {data.alerts.map((alert, index) => (
                    <li key={index}>• {alert}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-600">No urgent actions required.</p>
              )}
            </Panel>

            <Panel title="Pending Work">
              {data.pendingWork?.length > 0 ? (
                <ul className="space-y-2 text-sm text-slate-700">
                  {data.pendingWork.map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-600">No pending work right now.</p>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  to="/teacher/submissions"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Review Submissions
                </Link>
                <Link
                  to="/teacher/submissions"
                  className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                >
                  Open AI Essay Grading
                </Link>
              </div>
            </Panel>
          </div>

          <div className="mb-6 grid gap-4 xl:grid-cols-2">
            <Panel title="Class Performance Overview">
              {data.classPerformance?.length > 0 ? (
                <div className="space-y-2">
                  {data.classPerformance.map((item) => (
                    <div
                      key={item.subject}
                      className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2 text-sm"
                    >
                      <span className="font-medium text-slate-800">
                        {item.subject}
                      </span>
                      <span className="font-bold text-slate-900">
                        {item.averageMarks}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600">
                  No class performance data available.
                </p>
              )}

              <Link
                to="/teacher/score-trends"
                className="mt-4 inline-flex rounded-lg border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                View Class Analytics
              </Link>
            </Panel>

            <Panel title="Topic Error Summary">
              {topicSummary?.essaysAnalysed > 0 ? (
                <>
                  <div className="space-y-2 text-sm text-slate-700">
                    <p>
                      <span className="font-semibold">Essays Analysed:</span>{" "}
                      {topicSummary.essaysAnalysed}
                    </p>
                    <p>
                      <span className="font-semibold">Top Weak Topic:</span>{" "}
                      {topicSummary.topWeakTopic || "--"}
                    </p>
                    <p>
                      <span className="font-semibold">Most Missing Concept:</span>{" "}
                      {topicSummary.mostMissingConcept || "--"}
                    </p>
                    <p>
                      <span className="font-semibold">Strongest Area:</span>{" "}
                      {topicSummary.strongestArea || "--"}
                    </p>
                  </div>

                  {previewChartData.length > 0 && (
                    <div className="mt-4 h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={previewChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar
                            dataKey="count"
                            fill={CHART_COLORS.primary}
                            barSize={28}
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-600">
                  No topic error analysis data available yet.
                </p>
              )}

              <Link
                to="/teacher/topic-error-analysis"
                className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                View Full Topic Analysis
              </Link>
            </Panel>
          </div>

          <Panel
            title="Recent Student Results"
            action={
              <Link
                to="/teacher/marks"
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
                    <th className="p-3 font-bold">Student</th>
                    <th className="p-3 font-bold">Subject</th>
                    <th className="p-3 font-bold">Marks</th>
                    <th className="p-3 font-bold">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {!data.recentResults?.length ? (
                    <tr className="border-t">
                      <td colSpan={4} className="p-4 text-center text-slate-500">
                        No examination results available.
                      </td>
                    </tr>
                  ) : (
                    data.recentResults.map((result) => (
                      <tr key={result._id} className="border-t border-slate-200">
                        <td className="p-3">
                          {result.student?.user?.fullName || "--"}
                        </td>
                        <td className="p-3">{getSubjectName(result)}</td>
                        <td className="p-3">{result.marks}</td>
                        <td className="p-3">{result.grade || "--"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Quick Actions">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
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

function SecondaryCard({ title, value, hint }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
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

export default TeacherDashboard;
