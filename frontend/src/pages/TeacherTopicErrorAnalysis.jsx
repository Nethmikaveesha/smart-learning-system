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

const CHART_COLORS = {
  missing: "#2563eb",
  weak: "#16a34a",
};

function AnalyticsList({ title, items, labelKey }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h3 className="mb-3 font-bold text-slate-900">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No data available.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li
              key={index}
              className="flex justify-between gap-3 border-b border-slate-200 pb-2 text-sm"
            >
              <span>{item[labelKey] || item.label}</span>
              <span className="font-bold">{item.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TopicChart({ title, data, color }) {
  return (
    <div>
      <h3 className="mb-3 font-bold text-slate-900">{title}</h3>
      {data.length === 0 ? (
        <p className="text-sm text-slate-500">No chart data available.</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={70} />
            <YAxis allowDecimals={false} domain={[0, "auto"]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar
              dataKey="count"
              fill={color}
              barSize={32}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function TeacherTopicErrorAnalysis() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setError("");
        const params = selectedSubjectId ? { subjectId: selectedSubjectId } : {};
        const res = await api.get("/essays/topic-error-analytics", {
          headers: { Authorization: `Bearer ${token}` },
          params,
        });
        setData(res.data);
      } catch (fetchError) {
        setError(
          fetchError.response?.data?.message ||
            "Failed to load topic error analysis"
        );
      }
    };

    if (token) fetchAnalytics();
  }, [token, selectedSubjectId]);

  const missingConceptData =
    data?.missingConcepts?.slice(0, 8).map((item) => ({
      name: item.concept || item.label,
      count: item.count,
    })) || [];

  const weakTopicData =
    data?.weakTopics?.slice(0, 8).map((item) => ({
      name: item.topic || item.label,
      count: item.count,
    })) || [];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Topic Error Analysis</h1>
        <p className="mt-2 text-sm text-slate-600">
          Analyse weak topics, missing concepts, and strong areas by subject.
        </p>
      </div>

      {data?.subjects?.length > 0 && (
        <label className="mb-6 block text-sm text-slate-700">
          Selected Subject:
          <select
            value={selectedSubjectId}
            onChange={(event) => setSelectedSubjectId(event.target.value)}
            className="ml-2 rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All Assigned Subjects</option>
            {data.subjects.map((subject) => (
              <option key={subject._id} value={subject._id}>
                {subject.subjectName}
              </option>
            ))}
          </select>
        </label>
      )}

      {error ? (
        <div className="rounded-lg bg-red-100 p-4 text-red-700">{error}</div>
      ) : !data ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-600">
              Total essay submissions analysed:{" "}
              <strong>{data.totalSubmissions || 0}</strong>
            </p>
            {data.selectedSubject && (
              <p className="mt-1 text-sm text-slate-600">
                Filtered subject:{" "}
                <strong>{data.selectedSubject.subjectName}</strong>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:grid-cols-2">
            <TopicChart
              title="Common Missing Concepts"
              data={missingConceptData}
              color={CHART_COLORS.missing}
            />
            <TopicChart
              title="Common Weak Topics"
              data={weakTopicData}
              color={CHART_COLORS.weak}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <AnalyticsList
              title="Top Missing Concepts"
              items={data.missingConcepts || []}
              labelKey="concept"
            />
            <AnalyticsList
              title="Top Weak Topics"
              items={data.weakTopics || []}
              labelKey="topic"
            />
            <AnalyticsList
              title="Strong Areas"
              items={data.strongAreas || []}
              labelKey="area"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default TeacherTopicErrorAnalysis;
