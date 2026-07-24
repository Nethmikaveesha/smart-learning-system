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
      <PageHeader
        subjects={data?.subjects || []}
        selectedSubjectId={selectedSubjectId}
        onSubjectChange={setSelectedSubjectId}
      />

      {error ? (
        <AlertBox message={error} />
      ) : !data ? (
        <LoadingPanel />
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Essays Analysed"
              value={data.totalSubmissions || 0}
            />
            <MetricCard
              label="Missing Concepts"
              value={data.missingConcepts?.length || 0}
            />
            <MetricCard
              label="Weak Topics"
              value={data.weakTopics?.length || 0}
            />
          </section>

          {data.selectedSubject && (
            <section className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-900">
                Filtered Subject
              </p>
              <p className="mt-1 text-sm font-semibold text-blue-800">
                {data.selectedSubject.subjectName}
              </p>
            </section>
          )}

          <section className="grid gap-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:grid-cols-2">
            <TopicChart
              title="Common Missing Concepts"
              description="Concepts students frequently miss in essay submissions."
              data={missingConceptData}
              color={CHART_COLORS.missing}
            />

            <TopicChart
              title="Common Weak Topics"
              description="Topics that require additional teaching or revision."
              data={weakTopicData}
              color={CHART_COLORS.weak}
            />
          </section>

          <section className="grid gap-6 md:grid-cols-3">
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
          </section>
        </div>
      )}
    </div>
  );
}

function PageHeader({ subjects, selectedSubjectId, onSubjectChange }) {
  return (
    <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
            Teacher Analytics
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-950">
            Topic Error Analysis
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Review weak topics, missing concepts, and strong learning areas
            detected from essay submissions.
          </p>
        </div>

        {subjects.length > 0 && (
          <label className="text-sm font-bold text-slate-700">
            Subject
            <select
              value={selectedSubjectId}
              onChange={(event) => onSubjectChange(event.target.value)}
              className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
            >
              <option value="">All Assigned Subjects</option>
              {subjects.map((subject) => (
                <option key={subject._id} value={subject._id}>
                  {subject.subjectName}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </section>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="typo-metric mt-3 text-slate-950">{value}</p>
    </div>
  );
}

function TopicChart({ title, description, data, color }) {
  return (
    <div>
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>

      {data.length === 0 ? (
        <EmptyPanel message="No chart data available." />
      ) : (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={72}
              />
              <YAxis allowDecimals={false} domain={[0, "auto"]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar
                dataKey="count"
                fill={color}
                barSize={32}
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function AnalyticsList({ title, items, labelKey }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-xl font-semibold text-slate-950">{title}</h3>

      {items.length === 0 ? (
        <EmptyPanel message="No data available." compact />
      ) : (
        <ul className="mt-4 space-y-3">
          {items.slice(0, 8).map((item, index) => (
            <li
              key={index}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            >
              <span className="font-semibold text-slate-700">
                {item[labelKey] || item.label || "N/A"}
              </span>
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                {item.count || 0}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AlertBox({ message }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
      {message}
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-600">
        Loading topic error analysis...
      </p>
    </div>
  );
}

function EmptyPanel({ message, compact = false }) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50 text-center ${
        compact ? "mt-4 p-4" : "p-6"
      }`}
    >
      <p className="text-sm font-semibold text-slate-600">{message}</p>
    </div>
  );
}

export default TeacherTopicErrorAnalysis;