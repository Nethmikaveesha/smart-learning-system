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

function TeacherDashboard() {
  const { token, logout } = useAuth();
  const [data, setData] = useState(null);
  const [topicAnalytics, setTopicAnalytics] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      const res = await api.get("/teacher-dashboard", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setData(res.data);

      const topicRes = await api.get("/essays/topic-error-analytics", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setTopicAnalytics(topicRes.data);
    };

    fetchDashboard();
  }, [token]);

  const missingConceptData =
    topicAnalytics?.missingConcepts?.slice(0, 8).map((item) => ({
      name: item.concept,
      count: item.count,
    })) || [];

  const weakTopicData =
    topicAnalytics?.weakTopics?.slice(0, 8).map((item) => ({
      name: item.topic,
      count: item.count,
    })) || [];

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

          <TopicErrorAnalytics
            topicAnalytics={topicAnalytics}
            missingConceptData={missingConceptData}
            weakTopicData={weakTopicData}
          />

          <RecentResultsTable results={data.recentResults || []} />
        </>
      )}
    </div>
  );
}

function TopicErrorAnalytics({
  topicAnalytics,
  missingConceptData,
  weakTopicData,
}) {
  return (
    <div className="bg-white rounded-xl shadow p-5 mb-8">
      <h2 className="text-xl font-bold mb-2">
        Topic-Specific Error Analysis
      </h2>

      <p className="text-slate-600 mb-4">
        Total essay submissions analysed:{" "}
        <strong>{topicAnalytics?.totalSubmissions || 0}</strong>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <h3 className="font-bold mb-3">Common Missing Concepts</h3>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={missingConceptData}>
              <CartesianGrid />
              <XAxis dataKey="name" hide />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h3 className="font-bold mb-3">Common Weak Topics</h3>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weakTopicData}>
              <CartesianGrid />
              <XAxis dataKey="name" hide />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AnalyticsList
          title="Top Missing Concepts"
          items={topicAnalytics?.missingConcepts || []}
          labelKey="concept"
        />

        <AnalyticsList
          title="Top Weak Topics"
          items={topicAnalytics?.weakTopics || []}
          labelKey="topic"
        />

        <AnalyticsList
          title="Strong Areas"
          items={topicAnalytics?.strongAreas || []}
          labelKey="area"
        />
      </div>
    </div>
  );
}

function AnalyticsList({ title, items, labelKey }) {
  return (
    <div className="border rounded-lg p-4 bg-slate-50">
      <h3 className="font-bold mb-3">{title}</h3>

      {items.length === 0 ? (
        <p className="text-slate-500">No data available</p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 8).map((item, index) => (
            <li
              key={index}
              className="flex justify-between gap-3 border-b pb-2"
            >
              <span>{item[labelKey]}</span>
              <span className="font-bold">{item.count}</span>
            </li>
          ))}
        </ul>
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