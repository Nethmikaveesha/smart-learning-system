import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function StudentPerformanceTracker() {
  const { token } = useAuth();
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await api.get("/student-dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const rows = Array.isArray(res.data?.performanceResults)
          ? res.data.performanceResults
          : Array.isArray(res.data?.results)
            ? res.data.results
            : [];
        // Oldest → newest for time-series
        const ordered = [...rows].sort((left, right) => {
          const leftDate = new Date(
            left.exam?.examDate || left.createdAt || 0
          ).getTime();
          const rightDate = new Date(
            right.exam?.examDate || right.createdAt || 0
          ).getTime();
          return leftDate - rightDate;
        });

        setResults(ordered);
      } catch (fetchError) {
        setError(
          fetchError.response?.data?.message ||
            "Failed to load performance tracker"
        );
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchPerformance();
  }, [token]);

  const chartData = useMemo(
    () =>
      results.map((result, index) => {
        const examName =
          result.exam?.examName ||
          result.examName ||
          `Exam ${index + 1}`;
        const rawZ = result.zScore;
        const hasZScore =
          rawZ !== null && rawZ !== undefined && rawZ !== "" && !Number.isNaN(Number(rawZ));
        const zNumber = hasZScore ? Number(rawZ) : null;
        return {
          name:
            examName.length > 16 ? `${examName.slice(0, 14)}…` : examName,
          examName,
          marks: Number(result.marks ?? 0),
          zScore: zNumber,
          zScoreLabel: hasZScore ? zNumber.toFixed(2) : "--",
          grade: result.grade || "--",
          rank: result.rank > 0 ? result.rank : "--",
          subject:
            result.exam?.subject?.subjectName ||
            result.subject ||
            "Subject",
        };
      }),
    [results]
  );

  const averageMarks =
    chartData.length > 0
      ? Number(
          (
            chartData.reduce((sum, row) => sum + row.marks, 0) /
            chartData.length
          ).toFixed(2)
        )
      : null;

  const latest = chartData[chartData.length - 1];
  const latestZScoreLabel = latest?.zScoreLabel ?? "--";

  return (
    <div className="p-6">
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="typo-eyebrow text-blue-700">Student Analytics</p>
        <h1 className="mt-2 typo-page text-slate-950">Performance Tracker</h1>
        <p className="mt-2 max-w-3xl typo-body text-slate-600">
          Track examination marks and Z-scores together over time so you can see
          both raw performance and standing against the class.
        </p>
      </section>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 typo-ui text-slate-600 shadow-sm">
          Loading performance data...
        </div>
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Exams" value={chartData.length} />
            <MetricCard
              label="Average Marks"
              value={averageMarks ?? "--"}
            />
            <MetricCard
              label="Latest Z-Score"
              value={latestZScoreLabel}
            />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="typo-card text-slate-950">
                Marks & Z-Score Trend
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Blue line = marks (0–100). Green line = Z-score (right axis).
                Z-score needs at least 2 students in the same exam; otherwise it
                shows as unavailable.
              </p>
            </div>

            {chartData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis
                      yAxisId="marks"
                      domain={[0, 100]}
                      tick={{ fontSize: 12 }}
                      stroke="#2563eb"
                    />
                    <YAxis
                      yAxisId="zScore"
                      orientation="right"
                      domain={[-3, 3]}
                      tick={{ fontSize: 12 }}
                      stroke="#16a34a"
                    />
                    <Tooltip
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload?.examName || "Exam"
                      }
                    />
                    <Legend />
                    <Line
                      yAxisId="marks"
                      type="monotone"
                      dataKey="marks"
                      name="Marks"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                    <Line
                      yAxisId="zScore"
                      type="monotone"
                      dataKey="zScore"
                      name="Z-Score"
                      stroke="#16a34a"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-600">
                No academic performance data available yet.
              </p>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="typo-card text-slate-950">Examination Results</h2>
              <p className="mt-1 text-sm text-slate-600">
                Marks, grade, rank, and Z-score for each exam.
              </p>
            </div>

            {chartData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="p-3 font-semibold">Exam</th>
                      <th className="p-3 font-semibold">Subject</th>
                      <th className="p-3 font-semibold">Marks</th>
                      <th className="p-3 font-semibold">Grade</th>
                      <th className="p-3 font-semibold">Rank</th>
                      <th className="p-3 font-semibold">Z-Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...chartData].reverse().map((row, index) => (
                      <tr
                        key={`${row.examName}-${index}`}
                        className="border-t border-slate-100 text-slate-700"
                      >
                        <td className="p-3 font-semibold text-slate-950">
                          {row.examName}
                        </td>
                        <td className="p-3">{row.subject}</td>
                        <td className="p-3 font-semibold">{row.marks}</td>
                        <td className="p-3">{row.grade}</td>
                        <td className="p-3">{row.rank}</td>
                        <td className="p-3 font-semibold text-emerald-700">
                          {row.zScoreLabel}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="p-5 text-sm font-semibold text-slate-600">
                Results will appear after examinations are marked.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="typo-eyebrow text-slate-400">{label}</p>
      <p className="typo-metric mt-2 text-slate-950">{value}</p>
    </div>
  );
}

export default StudentPerformanceTracker;
