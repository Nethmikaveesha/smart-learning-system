import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  CartesianGrid,
} from "recharts";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function ParentDashboard() {
  const { token, logout } = useAuth();

  const [data, setData] = useState(null);
  const [gradeCorrelationData, setGradeCorrelationData] = useState([]);
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

        const correlationRes = await api.get(
          "/analytics/attendance-grades",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setGradeCorrelationData(correlationRes.data);
      } catch (error) {
        setError(
          error.response?.data?.message ||
            "Failed to load parent dashboard"
        );
      }
    };

    if (token) fetchDashboard();
  }, [token]);

  const downloadReport = async () => {
    try {
      const res = await api.get("/reports/student-report", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: "blob",
      });

      const fileURL = window.URL.createObjectURL(
        new Blob([res.data], { type: "application/pdf" })
      );

      const link = document.createElement("a");
      link.href = fileURL;
      link.setAttribute("download", "student-progress-report.pdf");

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(fileURL);
    } catch (error) {
      alert("Failed to download report");
      console.error(error);
    }
  };

  const performanceData =
    data?.results?.map((result) => ({
      exam: result.exam?.examName,
      marks: result.marks,
      zScore: result.zScore,
    })) || [];

  const attendanceData = [
    {
      name: "Attendance",
      value: data?.attendancePercentage || 0,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Parent Dashboard</h1>

        <div className="flex gap-3">
          <button
            onClick={downloadReport}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Download Report
          </button>

          <button
            onClick={logout}
            className="bg-red-600 text-white px-4 py-2 rounded"
          >
            Logout
          </button>
        </div>
      </div>

      {error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded">
          {error}
        </div>
      ) : !data ? (
        <p>Loading...</p>
      ) : (
        <>
          {/* Dashboard Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card title="Attendance" value={`${data.attendancePercentage}%`} />
            <Card title="Risk Status" value={data.riskStatus} />
            <Card
              title="Latest Marks"
              value={data.latestResult?.marks || "N/A"}
            />
            <Card
              title="Latest Grade"
              value={data.latestResult?.grade || "N/A"}
            />
          </div>

          {/* Risk Alert Notification Component */}
          {data.riskStatus !== "Low" && (
            <div className="bg-red-100 border border-red-300 text-red-700 p-4 rounded-xl mb-8">
              <strong>Risk Alert:</strong> Your child is currently marked as{" "}
              {data.riskStatus}. Please review attendance and recent marks.
            </div>
          )}

          {/* Child Profile Information */}
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

          {/* Analytical Charts Section */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow p-5">
              {/* Heading and Description Updated ✅ */}
              <h2 className="text-xl font-bold mb-4">
                Monthly Performance Line Graph
              </h2>

              <p className="text-sm text-slate-500 mb-4">
                Child's marks trend across monthly/term examinations.
              </p>

              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <XAxis dataKey="exam" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="marks"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="text-xl font-bold mb-4">
                Attendance Overview
              </h2>

              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={attendanceData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Attendance vs Grades Correlation Analytics */}
          <div className="bg-white rounded-xl shadow p-5 mb-8">
            <h2 className="text-xl font-bold mb-4">
              Attendance vs Grades Correlation
            </h2>

            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid />
                <XAxis
                  type="number"
                  dataKey="attendance"
                  name="Attendance"
                  unit="%"
                />
                <YAxis
                  type="number"
                  dataKey="averageMarks"
                  name="Average Marks"
                />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <Scatter
                  name="Grade Correlation"
                  data={gradeCorrelationData}
                />
              </ScatterChart>
            </ResponsiveContainer>

            <div className="mt-4">
              <table className="w-full border">
                <thead className="bg-slate-200">
                  <tr>
                    <th className="p-3">Student ID</th>
                    <th className="p-3">Attendance</th>
                    <th className="p-3">Average Marks</th>
                    <th className="p-3">Grade</th>
                  </tr>
                </thead>

                <tbody>
                  {gradeCorrelationData.map((item, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-3">{item.studentId}</td>
                      <td className="p-3">{item.attendance}%</td>
                      <td className="p-3">{item.averageMarks}</td>
                      <td className="p-3">{item.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Recent Examination Results */}
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