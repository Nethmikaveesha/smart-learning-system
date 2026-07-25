import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const SUBJECT_COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626"];

function AdminSystemAnalytics() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get("/analytics/institutional-trends", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data);
      } catch (fetchError) {
        setError(
          fetchError.response?.data?.message ||
            "Failed to load institutional analytics"
        );
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchTrends();
  }, [token]);

  const summary = data?.summary || {};
  const monthlyTrend = data?.monthlyTrend || [];
  const subjectComparison = data?.subjectComparison || [];
  const topSubjects = data?.topSubjects || [];
  const subjectTrendChart = data?.subjectTrendChart || [];

  return (
    <div className="p-6">
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="typo-eyebrow text-blue-700">Admin Analytics</p>
        <h1 className="mt-2 typo-page text-slate-950">System Analytics</h1>
        <p className="mt-2 max-w-3xl typo-body text-slate-600">
          Institutional performance over time — monthly averages, pass rates,
          and subject comparison for long-term academic monitoring.
        </p>
      </section>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 typo-ui text-slate-600 shadow-sm">
          Loading institutional trends...
        </div>
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Students" value={summary.totalStudents ?? 0} />
            <MetricCard
              label="Overall Average"
              value={summary.overallAverage ?? "--"}
            />
            <MetricCard
              label="Pass Rate %"
              value={summary.overallPassRate ?? "--"}
            />
            <MetricCard
              label="High Risk"
              value={summary.highRiskStudents ?? 0}
            />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="typo-card text-slate-950">
                Institutional Performance Trend
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Month-by-month average marks and pass rate across all published
                results.
              </p>
            </div>

            {monthlyTrend.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis
                      yAxisId="marks"
                      domain={[0, 100]}
                      tick={{ fontSize: 12 }}
                      stroke="#2563eb"
                    />
                    <YAxis
                      yAxisId="pass"
                      orientation="right"
                      domain={[0, 100]}
                      tick={{ fontSize: 12 }}
                      stroke="#16a34a"
                    />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="marks"
                      type="monotone"
                      dataKey="averageMarks"
                      name="Average Marks"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                    <Line
                      yAxisId="pass"
                      type="monotone"
                      dataKey="passRate"
                      name="Pass Rate %"
                      stroke="#16a34a"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart message="No monthly trend data yet. Publish exam results to build the institutional timeline." />
            )}
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="typo-card text-slate-950">
                  Subject Comparison
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Average marks by subject (lower averages need attention).
                </p>
              </div>

              {subjectComparison.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={subjectComparison}
                      margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar
                        dataKey="averageMarks"
                        name="Average Marks"
                        fill="#2563eb"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart message="No subject comparison data available yet." />
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="typo-card text-slate-950">
                  Subject Trends Over Time
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Top subjects by volume — average marks across months.
                </p>
              </div>

              {subjectTrendChart.length > 0 && topSubjects.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={subjectTrendChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      {topSubjects.map((subject, index) => (
                        <Line
                          key={subject}
                          type="monotone"
                          dataKey={subject}
                          name={subject}
                          stroke={SUBJECT_COLORS[index % SUBJECT_COLORS.length]}
                          strokeWidth={3}
                          connectNulls
                          dot={{ r: 3 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart message="Subject trend lines appear after results span multiple months/subjects." />
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="typo-card text-slate-950">Monthly Breakdown</h2>
              <p className="mt-1 text-sm text-slate-600">
                Result counts, averages, and pass/fail totals by month.
              </p>
            </div>

            {monthlyTrend.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="p-3 font-semibold">Month</th>
                      <th className="p-3 font-semibold">Results</th>
                      <th className="p-3 font-semibold">Average</th>
                      <th className="p-3 font-semibold">Pass Rate</th>
                      <th className="p-3 font-semibold">Pass</th>
                      <th className="p-3 font-semibold">Fail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...monthlyTrend].reverse().map((row) => (
                      <tr
                        key={row.month}
                        className="border-t border-slate-100 text-slate-700"
                      >
                        <td className="p-3 font-semibold text-slate-950">
                          {row.label}
                        </td>
                        <td className="p-3">{row.resultCount}</td>
                        <td className="p-3 font-semibold">{row.averageMarks}</td>
                        <td className="p-3">{row.passRate}%</td>
                        <td className="p-3 text-emerald-700">{row.passCount}</td>
                        <td className="p-3 text-red-600">{row.failCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="p-5 text-sm font-semibold text-slate-600">
                No monthly records available yet.
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

function EmptyChart({ message }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-sm font-semibold text-slate-600">
      {message}
    </div>
  );
}

export default AdminSystemAnalytics;
