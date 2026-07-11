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

function AdminDashboard() {
  const { token } = useAuth();

  const [adminData, setAdminData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [teacherData, setTeacherData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };

        const [adminRes, summaryRes, teacherRes, usersRes] = await Promise.all([
          api.get("/admin-dashboard", { headers }),
          api.get("/results/analytics-summary", { headers }),
          api.get("/teacher-dashboard", { headers }),
          api.get("/users", { headers }),
        ]);

        const users = usersRes.data || [];
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
          totalAdmins:
            adminRes.data?.totalAdmins ?? roleCounts.admins,
          totalTeachers:
            adminRes.data?.totalTeachers ?? roleCounts.teachers,
          totalParents:
            adminRes.data?.totalParents ?? roleCounts.parents,
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
      <h1 className="mb-6 text-3xl font-bold">Admin Dashboard</h1>

      {error ? (
        <div className="rounded bg-red-100 p-4 text-red-700">{error}</div>
      ) : !adminData || !summary ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card title="Total Users" value={adminData.totalUsers} />
            <Card title="Total Admins" value={adminData.totalAdmins} />
            <Card title="Total Teachers" value={adminData.totalTeachers} />
            <Card title="Total Students" value={adminData.totalStudents} />
            <Card title="Total Parents" value={adminData.totalParents} />
            <Card title="Total Subjects" value={adminData.totalSubjects} />
            <Card title="Total Exams" value={adminData.totalExams} />
            <Card title="Total Results" value={adminData.totalResults} />
            <Card title="Pass Count" value={adminData.passCount} />
            <Card title="Fail Count" value={adminData.failCount} />
            <Card
              title="Pass Percentage"
              value={`${Number(adminData.passPercentage).toFixed(2)}%`}
            />
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card title="Average Marks" value={formatMarks(summary.averageMarks)} />
            <Card
              title="High Risk Students"
              value={summary.highRiskStudents}
              to="/admin/system-analytics"
              hint="View analytics"
            />
            <Card
              title="Average Attendance"
              value={`${formatMarks(summary.averageAttendance)}%`}
              hint="Based on current student profiles"
            />
          </div>

          <AdminCharts summary={summary} />

          <div className="mb-8 rounded-xl bg-white p-5 shadow">
            <h2 className="mb-4 text-xl font-bold">
              System-Wide Subject Difficulty Analysis
            </h2>

            {subjectDifficultyData.length === 0 ? (
              <p className="text-slate-600">No results available.</p>
            ) : (
              <>
                <div className="relative h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={subjectDifficultyData}
                      margin={{ top: 16, right: 16, left: 0, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="subject" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip
                        formatter={(value, name) => [
                          name === "averageMarks"
                            ? formatMarks(value)
                            : value,
                          name === "averageMarks" ? "Average Marks" : name,
                        ]}
                      />
                      <Bar
                        dataKey="averageMarks"
                        name="Average Marks"
                        fill="#2563eb"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={60}
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

                <table className="mt-6 w-full border text-left">
                  <thead className="bg-slate-200">
                    <tr>
                      <th className="p-3">Subject</th>
                      <th className="p-3">Average Marks</th>
                      <th className="p-3">Result Count</th>
                      <th className="p-3">Fail Count</th>
                    </tr>
                  </thead>

                  <tbody>
                    {subjectDifficultyData.map((item) => (
                      <tr key={item.subject} className="border-t">
                        <td className="p-3">{item.subject}</td>
                        <td className="p-3">{formatMarks(item.averageMarks)}</td>
                        <td className="p-3">{item.resultCount ?? 0}</td>
                        <td className="p-3">{item.failCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>

          <RecentResultsTable results={teacherData?.recentResults || []} />
        </>
      )}
    </div>
  );
}

function Card({ title, value, to, hint }) {
  const displayValue = value ?? 0;

  const content = (
    <div className={`rounded-xl bg-white p-5 shadow ${to ? "transition hover:shadow-md" : ""}`}>
      <p className="text-slate-500">{title}</p>
      <h2 className="mt-2 text-3xl font-bold">{displayValue}</h2>
      {hint && <p className="mt-2 text-xs font-medium text-blue-700">{hint}</p>}
    </div>
  );

  if (to) {
    return <Link to={to}>{content}</Link>;
  }

  return content;
}

function RecentResultsTable({ results }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow">
      <h2 className="mb-4 text-xl font-bold">Recent Results</h2>

      {results.length === 0 ? (
        <p className="text-slate-600">No results available.</p>
      ) : (
        <table className="w-full border text-left">
          <thead className="bg-slate-200">
            <tr>
              <th className="p-3">Student</th>
              <th className="p-3">Exam</th>
              <th className="p-3">Marks</th>
              <th className="p-3">Grade</th>
              <th className="p-3">Rank</th>
            </tr>
          </thead>

          <tbody>
            {results.map((item) => (
              <tr key={item._id} className="border-t">
                <td className="p-3">
                  {item.student?.user?.fullName || "N/A"}
                </td>
                <td className="p-3">{item.exam?.examName || "N/A"}</td>
                <td className="p-3">{formatMarks(item.marks)}</td>
                <td className="p-3">{item.grade}</td>
                <td className="p-3">{formatRank(item.rank)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default AdminDashboard;
