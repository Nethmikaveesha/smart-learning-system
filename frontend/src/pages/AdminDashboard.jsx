import { useEffect, useState } from "react";
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
import AdminCharts from "../components/AdminCharts";

function AdminDashboard() {
  const { token } = useAuth();

  const [adminData, setAdminData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [teacherData, setTeacherData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const adminRes = await api.get("/admin-dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const summaryRes = await api.get("/results/analytics-summary", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const teacherRes = await api.get("/teacher-dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setAdminData(adminRes.data);
        setSummary(summaryRes.data);
        setTeacherData(teacherRes.data);
      } catch (error) {
        setError(
          error.response?.data?.message ||
            "Failed to load admin dashboard"
        );
      }
    };

    if (token) fetchData();
  }, [token]);

  const subjectDifficultyData =
    adminData?.subjectDifficulty?.map((item) => ({
      subject: item.subject,
      averageMarks: item.averageMarks,
      failCount: item.failCount,
    })) || [];

  return (
    <div className="p-6">
      <h1 className="mb-6 text-3xl font-bold">Admin Dashboard</h1>

      {error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded">
          {error}
        </div>
      ) : !adminData || !summary ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card title="Total Users" value={adminData.totalUsers} />
            <Card title="Total Students" value={adminData.totalStudents} />
            <Card title="Total Subjects" value={adminData.totalSubjects} />
            <Card title="Total Exams" value={adminData.totalExams} />
            <Card title="Total Results" value={adminData.totalResults} />
            <Card title="Pass Count" value={adminData.passCount} />
            <Card title="Fail Count" value={adminData.failCount} />
            <Card
              title="Pass Percentage"
              value={`${adminData.passPercentage}%`}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card title="Average Marks" value={summary.averageMarks} />
            <Card
              title="High Risk Students"
              value={summary.highRiskStudents}
            />
            <Card
              title="Average Attendance"
              value={`${summary.averageAttendance}%`}
            />
          </div>

          <AdminCharts summary={summary} />

          <div className="bg-white rounded-xl shadow p-5 mb-8">
            <h2 className="text-xl font-bold mb-4">
              System-Wide Subject Difficulty Analysis
            </h2>

            {subjectDifficultyData.length === 0 ? (
              <p>No subject difficulty data available.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={subjectDifficultyData}>
                    <CartesianGrid />
                    <XAxis dataKey="subject" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="averageMarks" name="Average Marks" />
                  </BarChart>
                </ResponsiveContainer>

                <table className="w-full border mt-6">
                  <thead className="bg-slate-200">
                    <tr>
                      <th className="p-3">Subject</th>
                      <th className="p-3">Average Marks</th>
                      <th className="p-3">Fail Count</th>
                    </tr>
                  </thead>

                  <tbody>
                    {subjectDifficultyData.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-3">{item.subject}</td>
                        <td className="p-3">{item.averageMarks}</td>
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

function Card({ title, value }) {
  return (
    <div className="bg-white p-5 rounded-xl shadow">
      <p className="text-slate-500">{title}</p>
      <h2 className="text-3xl font-bold mt-2">{value}</h2>
    </div>
  );
}

function RecentResultsTable({ results }) {
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <h2 className="text-xl font-bold mb-4">Recent Results</h2>

      <table className="w-full text-left border">
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
              <td className="p-3">{item.marks}</td>
              <td className="p-3">{item.grade}</td>
              <td className="p-3">{item.rank}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminDashboard;
