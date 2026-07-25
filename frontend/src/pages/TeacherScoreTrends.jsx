import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function TeacherScoreTrends() {
  const { token } = useAuth();

  const [data, setData] = useState(null);
  const [subjectId, setSubjectId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        setLoading(true);
        setError("");

        const params = {};
        if (subjectId) params.subjectId = subjectId;
        if (studentId) params.studentId = studentId;

        const res = await api.get("/teacher-dashboard/score-trends", {
          headers: { Authorization: `Bearer ${token}` },
          params,
        });

        setData(res.data);
      } catch (fetchError) {
        setError(
          fetchError.response?.data?.message || "Failed to load score trends"
        );
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchTrends();
  }, [token, subjectId, studentId]);

  const chartPoints = data?.chartPoints || [];

  return (
    <div className="p-6">
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="typo-eyebrow text-blue-700">Teacher Analytics</p>
            <h1 className="mt-2 typo-page text-slate-950">Score Trends</h1>
            <p className="mt-2 max-w-3xl typo-body text-slate-600">
              Track class and student average marks across examinations. Use the
              filters to focus on one subject or one student.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="typo-label text-slate-700">
              Subject
              <select
                value={subjectId}
                onChange={(event) => setSubjectId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
              >
                <option value="">All subjects</option>
                {(data?.subjects || []).map((subject) => (
                  <option key={subject._id} value={subject._id}>
                    {subject.subjectName}
                  </option>
                ))}
              </select>
            </label>

            <label className="typo-label text-slate-700">
              Student
              <select
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
                className="mt-1 w-full min-w-52 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
              >
                <option value="">Whole class average</option>
                {(data?.students || []).map((student) => (
                  <option key={student._id} value={student._id}>
                    {student.fullName} ({student.studentId})
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 typo-ui text-slate-600 shadow-sm">
          Loading score trends...
        </div>
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Exams" value={data?.examCount ?? 0} />
            <MetricCard
              label="Latest Average"
              value={
                data?.latestAverage !== null && data?.latestAverage !== undefined
                  ? data.latestAverage
                  : "--"
              }
            />
            <MetricCard
              label="Overall Average"
              value={
                data?.overallAverage !== null && data?.overallAverage !== undefined
                  ? data.overallAverage
                  : "--"
              }
            />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="typo-card text-slate-950">
                  {studentId ? "Student Score Trend" : "Class Score Trend"}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Average marks across examinations (interactive chart).
                </p>
              </div>
              <span className="w-fit rounded-full bg-blue-50 px-3 py-1 typo-caption font-semibold text-blue-700">
                {chartPoints.length} exam point
                {chartPoints.length === 1 ? "" : "s"}
              </span>
            </div>

            {chartPoints.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartPoints}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value) => [`${value}`, "Average marks"]}
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload?.examName || "Exam"
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="averageMarks"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-600">
                No examination results yet for this filter. Add marks under Marks
                Management to see the trend chart.
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="typo-card text-slate-950">Exam Breakdown</h2>
              <p className="mt-1 text-sm text-slate-600">
                Average, result count, and pass count per examination.
              </p>
            </div>

            {(data?.classTrend || []).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="p-3 font-semibold">Exam</th>
                      <th className="p-3 font-semibold">Subject</th>
                      <th className="p-3 font-semibold">Class</th>
                      <th className="p-3 font-semibold">Date</th>
                      <th className="p-3 font-semibold">Average</th>
                      <th className="p-3 font-semibold">Results</th>
                      <th className="p-3 font-semibold">Pass Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.classTrend.map((row) => (
                      <tr
                        key={row.examId}
                        className="border-t border-slate-100 text-slate-700"
                      >
                        <td className="p-3 font-semibold text-slate-900">
                          {row.examName}
                        </td>
                        <td className="p-3">{row.subject}</td>
                        <td className="p-3">{row.className}</td>
                        <td className="p-3">
                          {row.examDate
                            ? new Date(row.examDate).toLocaleDateString()
                            : "--"}
                        </td>
                        <td className="p-3 font-semibold text-slate-950">
                          {row.averageMarks ?? "--"}
                        </td>
                        <td className="p-3">{row.resultCount}</td>
                        <td className="p-3">{row.passCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="p-5 text-sm font-semibold text-slate-600">
                No exams found for your assigned classes yet.
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

export default TeacherScoreTrends;
