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
  LabelList,
} from "recharts";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import AdminCharts from "../components/AdminCharts";
import { formatMarks, formatRank } from "../utils/formatters";

// Admin quick navigation cards.
// These make the dashboard feel like a real command center.
const QUICK_ACTIONS = [
  { label: "Add Teacher", to: "/admin/users/add-teacher" },
  { label: "Add Student", to: "/admin/users/add-student" },
  { label: "Add Parent", to: "/admin/users/add-parent" },
  { label: "View Users", to: "/admin/users" },
  { label: "System Analytics", to: "/admin/system-analytics" },
];

function AdminDashboard() {
  const { token } = useAuth();

  const [adminData, setAdminData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [teacherData, setTeacherData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError("");

        const headers = { Authorization: `Bearer ${token}` };

        // Load all dashboard data together to reduce waiting time.
        const [adminRes, summaryRes, teacherRes, usersRes] = await Promise.all([
          api.get("/admin-dashboard", { headers }),
          api.get("/results/analytics-summary", { headers }),
          api.get("/teacher-dashboard", { headers }),
          api.get("/users", { headers }),
        ]);

        const users = usersRes.data || [];

        // Some totals are calculated here as fallback values.
        const roleCounts = users.reduce(
          (counts, user) => {
            if (user.role === "admin") counts.admins += 1;
            if (user.role === "teacher") counts.teachers += 1;
            if (user.role === "parent") counts.parents += 1;
            return counts;
          },
          { admins: 0, teachers: 0, parents: 0 }
        );

        setAdminData({
          ...adminRes.data,
          totalAdmins: adminRes.data?.totalAdmins ?? roleCounts.admins,
          totalTeachers: adminRes.data?.totalTeachers ?? roleCounts.teachers,
          totalParents: adminRes.data?.totalParents ?? roleCounts.parents,
        });

        setSummary(summaryRes.data);
        setTeacherData(teacherRes.data);
      } catch (fetchError) {
        setError(
          fetchError.response?.data?.message ||
            "Failed to load admin dashboard"
        );
      }
    };

    if (token) fetchData();
  }, [token]);

  const subjectDifficultyData = adminData?.subjectDifficulty || [];

  return (
    <div className="p-6">
      <DashboardHeader />

      {error ? (
        <AlertBox message={error} />
      ) : !adminData || !summary ? (
        <LoadingPanel />
      ) : (
        <>
          <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total Users" value={adminData.totalUsers} />
            <MetricCard label="Admins" value={adminData.totalAdmins} />
            <MetricCard label="Teachers" value={adminData.totalTeachers} />
            <MetricCard label="Students" value={adminData.totalStudents} />
            <MetricCard label="Parents" value={adminData.totalParents} />
            <MetricCard label="Subjects" value={adminData.totalSubjects} />
            <MetricCard label="Exams" value={adminData.totalExams} />
            <MetricCard label="Results" value={adminData.totalResults} />
          </section>

          <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Pass Count"
              value={adminData.passCount}
              badgeClass="bg-emerald-100 text-emerald-700"
            />
            <MetricCard
              label="Fail Count"
              value={adminData.failCount}
              badgeClass="bg-red-100 text-red-700"
            />
            <MetricCard
              label="Pass Percentage"
              value={`${Number(adminData.passPercentage || 0).toFixed(2)}%`}
              badgeClass="bg-blue-100 text-blue-700"
            />
            <MetricCard
              label="High Risk Students"
              value={summary.highRiskStudents}
              to="/admin/system-analytics"
              badgeClass="bg-amber-100 text-amber-700"
            />
          </section>

          <section className="mb-6 grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Average Marks"
              value={formatMarks(summary.averageMarks)}
            />
            <MetricCard
              label="Average Attendance"
              value={`${formatMarks(summary.averageAttendance)}%`}
            />
            <MetricCard
              label="System Health"
              value="Active"
              badgeClass="bg-emerald-100 text-emerald-700"
            />
          </section>

          <Panel title="Quick Actions" description="Common administration tasks.">
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

          <Panel
            title="System Analytics"
            description="Overall academic performance, attendance, and risk summary."
          >
            <AdminCharts summary={summary} />
          </Panel>

          <Panel
            title="System-Wide Subject Difficulty Analysis"
            description="Subjects with lower averages or higher fail counts need academic attention."
          >
            {subjectDifficultyData.length === 0 ? (
              <EmptyState
                title="No results available"
                message="Subject difficulty analysis will appear after exam results are published."
              />
            ) : (
              <>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={subjectDifficultyData}
                      margin={{ top: 20, right: 16, left: 0, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value, name) => [
                          name === "averageMarks" ? formatMarks(value) : value,
                          name === "averageMarks" ? "Average Marks" : name,
                        ]}
                      />
                      <Bar
                        dataKey="averageMarks"
                        name="Average Marks"
                        fill="#2563eb"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={64}
                      >
                        <LabelList
                          dataKey="averageMarks"
                          position="top"
                          formatter={(value) => formatMarks(value)}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="p-3 font-semibold">Subject</th>
                        <th className="p-3 font-semibold">Average Marks</th>
                        <th className="p-3 font-semibold">Result Count</th>
                        <th className="p-3 font-semibold">Fail Count</th>
                      </tr>
                    </thead>

                    <tbody>
                      {subjectDifficultyData.map((item) => (
                        <tr
                          key={item.subject}
                          className="border-t border-slate-200 bg-white"
                        >
                          <td className="p-3 font-semibold text-slate-800">
                            {item.subject}
                          </td>
                          <td className="p-3 font-semibold text-slate-950">
                            {formatMarks(item.averageMarks)}
                          </td>
                          <td className="p-3 text-slate-600">
                            {item.resultCount ?? 0}
                          </td>
                          <td className="p-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                Number(item.failCount) > 0
                                  ? "bg-red-100 text-red-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {item.failCount ?? 0}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Panel>

          <RecentResultsTable results={teacherData?.recentResults || []} />
        </>
      )}
    </div>
  );
}

function DashboardHeader() {
  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
            Admin Dashboard
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-950">
            System Overview
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Monitor users, academic performance, attendance, results, and
            system-wide learning risk from one administrative workspace.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/admin/users/add-student"
            className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
          >
            Add Student
          </Link>
          <Link
            to="/admin/users"
            className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            View Users
          </Link>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, to, badgeClass }) {
  const displayValue = value ?? 0;

  const card = (
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

  if (to) {
    return <Link to={to}>{card}</Link>;
  }

  return card;
}

function Panel({ title, description, children }) {
  return (
    <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
        {description && (
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function RecentResultsTable({ results }) {
  return (
    <Panel
      title="Recent Results"
      description="Latest published student results across the system."
    >
      {results.length === 0 ? (
        <EmptyState
          title="No results available"
          message="Recent student results will appear after teachers publish marks."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="p-3 font-semibold">Student</th>
                <th className="p-3 font-semibold">Exam</th>
                <th className="p-3 font-semibold">Marks</th>
                <th className="p-3 font-semibold">Grade</th>
                <th className="p-3 font-semibold">Rank</th>
              </tr>
            </thead>

            <tbody>
              {results.map((item) => (
                <tr
                  key={item._id}
                  className="border-t border-slate-200 bg-white"
                >
                  <td className="p-3 font-semibold text-slate-800">
                    {item.student?.user?.fullName || "N/A"}
                  </td>
                  <td className="p-3 text-slate-600">
                    {item.exam?.examName || "N/A"}
                  </td>
                  <td className="p-3 font-semibold text-slate-950">
                    {formatMarks(item.marks)}
                  </td>
                  <td className="p-3">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {item.grade || "--"}
                    </span>
                  </td>
                  <td className="p-3 font-semibold text-slate-700">
                    {formatRank(item.rank)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
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
        Loading admin dashboard...
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

export default AdminDashboard;