import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function ParentDashboard() {
  const { token, logout } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get("/parent-dashboard", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setData(res.data);
      } catch (error) {
        setError(
          error.response?.data?.message ||
            "Failed to load parent dashboard"
        );
      }
    };

    if (token) fetchDashboard();
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Parent Dashboard</h1>

        <button
          onClick={logout}
          className="bg-red-600 text-white px-4 py-2 rounded"
        >
          Logout
        </button>
      </div>

      {error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded">
          {error}
        </div>
      ) : !data ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card title="Attendance" value={`${data.attendancePercentage}%`} />
            <Card title="Risk Status" value={data.riskStatus} />
            <Card title="Latest Marks" value={data.latestResult?.marks || "N/A"} />
            <Card title="Latest Grade" value={data.latestResult?.grade || "N/A"} />
          </div>

          <div className="bg-white rounded-xl shadow p-5 mb-8">
            <h2 className="text-xl font-bold mb-4">Child Information</h2>

            <p className="mb-2">
              <strong>Name:</strong> {data.student?.user?.fullName}
            </p>

            <p className="mb-2">
              <strong>Email:</strong> {data.student?.user?.email}
            </p>

            <p className="mb-2">
              <strong>Student ID:</strong> {data.student?.studentId}
            </p>

            <p className="mb-2">
              <strong>Class:</strong> {data.student?.class?.className}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-xl font-bold mb-4">Recent Results</h2>

            <table className="w-full border">
              <thead className="bg-slate-200">
                <tr>
                  <th className="p-3">Exam</th>
                  <th className="p-3">Marks</th>
                  <th className="p-3">Grade</th>
                  <th className="p-3">Rank</th>
                  <th className="p-3">Z-Score</th>
                </tr>
              </thead>

              <tbody>
                {data.results?.map((result) => (
                  <tr key={result._id} className="border-t">
                    <td className="p-3">{result.exam?.examName}</td>
                    <td className="p-3">{result.marks}</td>
                    <td className="p-3">{result.grade}</td>
                    <td className="p-3">{result.rank}</td>
                    <td className="p-3">{result.zScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

export default ParentDashboard;