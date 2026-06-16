import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function TeacherDashboard() {
  const { token, logout } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      const res = await api.get("/teacher-dashboard", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setData(res.data);
    };

    fetchDashboard();
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Teacher Dashboard</h1>

        <button
          onClick={logout}
          className="bg-red-600 text-white px-4 py-2 rounded"
        >
          Logout
        </button>
      </div>

      {!data ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card title="Total Students" value={data.totalStudents} />
            <Card title="Total Exams" value={data.totalExams} />
            <Card title="Total Results" value={data.totalResults} />
            <Card title="Average Marks" value={data.averageMarks} />
            <Card title="Pass Count" value={data.passCount} />
            <Card title="Fail Count" value={data.failCount} />
            <Card title="High Risk Students" value={data.highRiskStudents} />
          </div>

          <RecentResultsTable results={data.recentResults || []} />
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
      <h2 className="text-xl font-bold mb-4">Recent Student Results</h2>

      <table className="w-full text-left border">
        <thead className="bg-slate-200">
          <tr>
            <th className="p-3">Student</th>
            <th className="p-3">Exam</th>
            <th className="p-3">Marks</th>
            <th className="p-3">Grade</th>
            <th className="p-3">Z-Score</th>
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
              <td className="p-3">{item.zScore}</td>
              <td className="p-3">{item.rank}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TeacherDashboard;