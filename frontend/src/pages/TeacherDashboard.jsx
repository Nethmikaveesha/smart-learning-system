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

// Dashboard chart colors are kept in one place for consistency.
const CHART_COLORS = {
  primary: "#2563eb",
};

// Teacher shortcut actions.
const QUICK_ACTIONS = [
  { label: "Create Paper", to: "/teacher/create-paper" },
  { label: "Question Bank", to: "/teacher/question-bank" },
  { label: "Marking Schemes", to: "/teacher/marking-schemes" },
  { label: "Student Submissions", to: "/teacher/submissions" },
  { label: "Attendance", to: "/teacher/attendance" },
];

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
      <DashboardHeader
        teacherName={data?.teacher?.fullName || "Teacher"}
        classLabel={classLabel}
        subjectLabel={subjectLabel}
      />

      {error ? (
        <AlertBox message={error} />
      ) : !data ? (
        <LoadingPanel />
      ) : (
        <>
          <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total Students" value={data.totalStudents} />
            <MetricCard
              label="Pending Submissions"
              value={data.pendingSubmissions}
              badgeClass={
                Number(data.pendingSubmissions) > 0
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-100 text-emerald-700"
              }
            />
            <MetricCard
              label="Average Marks"
              value={data.averageMarks ? data.averageMarks : "--"}
            />
            <MetricCard
              label="High-Risk Students"
              value={data.highRiskStudents}
              badgeClass={
                Number(data.highRiskStudents) > 0
                  ? "bg-red-100 text-red-700"
                  : "bg-emerald-100 text-emerald-700"
              }
            />
          </section>

          <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total Exams" value={data.totalExams} />
            <MetricCard
              label="Pass Rate"
              value={data.passRate ? `${data.passRate}%` : "--"}
              badgeClass="bg-blue-100 text-blue-700"
            />
            <MetricCard
              label="Attendance Rate"
              value={data.averageAttendance ? `${data.averageAttendance}%` : "--"}
            />
            <MetricCard label="Ungraded Essays" value={data.ungradedEssays} />
          </section>

          <Panel title="Quick Actions" description="Common teaching workflows.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.to}
                  to={action.to}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-sm font-semibold text-slate-800 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </Panel>

          <div className="mb-6 grid gap-4 xl:grid-cols-2">
            <Panel title="Teacher Alerts">
              {data.alerts?.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {data.alerts.map((alert, index) => (
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
                  title="No urgent alerts"
                  message="There are no urgent academic or submission alerts right now."
                />
              )}
            </Panel>

            <Panel title="Pending Work">
              {data.pendingWork?.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {data.pendingWork.map((item, index) => (
                    <li
                      key={index}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title="No pending work"
                  message="All current teacher tasks are up to date."
                />
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  to="/teacher/submissions"
                  className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
                >
                  Review Submissions
                </Link>

                <Link
                  to="/teacher/submissions"
                  className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  Open AI Essay Grading
                </Link>
              </div>
            </Panel>
          </div>

          <div className="mb-6 grid gap-4 xl:grid-cols-2">
            <Panel
              title="Class Performance Overview"
              description="Latest average performance by assigned subject."
            >
              {data.classPerformance?.length > 0 ? (
                <div className="space-y-2">
                  {data.classPerformance.map((item) => (
                    <div
                      key={item.subject}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    >
                      <span className="font-bold text-slate-700">
                        {item.subject}
                      </span>
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                        {item.averageMarks}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No class performance data"
                  message="Class performance will appear after marks are published."
                />
              )}

              <Link
                to="/teacher/score-trends"
                className="mt-4 inline-flex rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                View Class Analytics
              </Link>
            </Panel>

            <Panel
              title="Topic Error Summary"
              description="AI-supported summary of weak topics from essay submissions."
            >
              {topicSummary?.essaysAnalysed > 0 ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoStat
                      label="Essays Analysed"
                      value={topicSummary.essaysAnalysed}
                    />
                    <InfoStat
                      label="Top Weak Topic"
                      value={topicSummary.topWeakTopic || "--"}
                    />
                    <InfoStat
                      label="Missing Concept"
                      value={topicSummary.mostMissingConcept || "--"}
                    />
                    <InfoStat
                      label="Strongest Area"
                      value={topicSummary.strongestArea || "--"}
                    />
                  </div>

                  {previewChartData.length > 0 && (
                    <div className="mt-5 h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={previewChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar
                            dataKey="count"
                            fill={CHART_COLORS.primary}
                            barSize={28}
                            radius={[6, 6, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              ) : (
                <EmptyState
                  title="No topic analysis yet"
                  message="Topic error analysis will appear after essay submissions are analysed."
                />
              )}

              <Link
                to="/teacher/topic-error-analysis"
                className="mt-4 inline-flex rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
              >
                View Full Topic Analysis
              </Link>
            </Panel>
          </div>

          <Panel
            title="Recent Student Results"
            description="Recently published marks from assigned classes."
            action={
              <Link
                to="/teacher/marks"
                className="text-sm font-semibold text-blue-700 hover:underline"
              >
                View All Results
              </Link>
            }
          >
            <RecentResultsTable results={data.recentResults || []} />
          </Panel>

          <Panel title="Teaching Shortcuts">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.to}
                  to={action.to}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-sm font-semibold text-slate-800 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
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

function DashboardHeader({ teacherName, classLabel, subjectLabel }) {
  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
            Teacher Dashboard
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-950">
            Welcome, {teacherName}
          </h1>

          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <InfoStat label="Assigned Class" value={classLabel} />
            <InfoStat label="Assigned Subjects" value={subjectLabel} />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/teacher/create-paper"
            className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
          >
            Create Paper
          </Link>

          <Link
            to="/teacher/submissions"
            className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            Mark Submissions
          </Link>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, badgeClass }) {
  const displayValue = value ?? "--";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      {badgeClass ? (
        <span
          className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${badgeClass}`}
        >
          {displayValue}
        </span>
      ) : (
        <h2 className="mt-3 truncate text-3xl font-bold text-slate-950">
          {displayValue}
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
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
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

function RecentResultsTable({ results }) {
  if (!results.length) {
    return (
      <EmptyState
        title="No examination results"
        message="Recent results will appear after marks are added."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-100 text-slate-700">
          <tr>
            <th className="p-3 font-semibold">Student</th>
            <th className="p-3 font-semibold">Subject</th>
            <th className="p-3 font-semibold">Marks</th>
            <th className="p-3 font-semibold">Grade</th>
          </tr>
        </thead>

        <tbody>
          {results.map((result) => (
            <tr key={result._id} className="border-t border-slate-200 bg-white">
              <td className="p-3 font-semibold text-slate-800">
                {result.student?.user?.fullName || "--"}
              </td>
              <td className="p-3 text-slate-600">{getSubjectName(result)}</td>
              <td className="p-3 font-semibold text-slate-950">
                {result.marks ?? "--"}
              </td>
              <td className="p-3">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
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
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
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
        Loading teacher dashboard...
      </p>
    </div>
  );
}

function EmptyState({ title, message }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">{message}</p>
    </div>
  );
}

function getSubjectName(result) {
  return (
    result.exam?.subject?.subjectName ||
    result.exam?.examName?.split(" - ").pop() ||
    "General"
  );
}

export default TeacherDashboard;