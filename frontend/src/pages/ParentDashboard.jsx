import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import api, {
  predictCommerceRisk,
  predictPassFailRisk,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import { formatMarks } from "../utils/formatters";

const QUICK_ACTIONS = [
  { label: "View Child Overview", to: "/parent/child-overview" },
  { label: "Marks & Rankings", to: "/parent/marks-rankings" },
  { label: "Attendance", to: "/parent/attendance" },
  { label: "Progress Reports", to: "/parent/progress-reports" },
  { label: "Risk Alerts", to: "/parent/risk-alerts" },
];

function formatSummaryValue(value, type = "text") {
  if (value === null || value === undefined || value === "") return "--";

  if (type === "percent") {
    const numericValue = Number(value);
    return numericValue > 0 ? `${formatMarks(numericValue)}%` : "--";
  }

  if (type === "number") {
    const numericValue = Number(value);
    return numericValue !== 0 ? formatMarks(numericValue) : "--";
  }

  return value || "--";
}

function formatRiskStatus(status) {
  if (!status) return "--";
  if (status === "Low") return "Low Risk";
  if (status === "Medium") return "Medium Risk";
  if (status === "High") return "High Risk";
  return status;
}

function getSubjectName(result) {
  return (
    result.exam?.subject?.subjectName ||
    result.exam?.examName?.split(" - ").pop() ||
    "General"
  );
}

function ParentDashboard() {
  const { token } = useAuth();

  const [data, setData] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [error, setError] = useState("");

  // ML prediction states
  const [mlLoading, setMlLoading] = useState("");
  const [mlError, setMlError] = useState("");
  const [passFailPrediction, setPassFailPrediction] = useState(null);
  const [commercePrediction, setCommercePrediction] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setError("");

        const params = selectedStudentId ? { studentId: selectedStudentId } : {};
        const res = await api.get("/parent-dashboard", {
          headers: { Authorization: `Bearer ${token}` },
          params,
        });

        setData(res.data);

        if (!selectedStudentId && res.data.selectedStudentId) {
          setSelectedStudentId(res.data.selectedStudentId);
        }
      } catch (fetchError) {
        setError(
          fetchError.response?.data?.message ||
            "Failed to load parent dashboard"
        );
      }
    };

    if (token) fetchDashboard();
  }, [token, selectedStudentId]);

  const recentResults = useMemo(() => data?.results?.slice(0, 3) || [], [data]);

  const trendData = useMemo(
    () =>
      (data?.subjectPerformance || []).map((item) => ({
        subject: item.subject.split(" ")[0],
        marks: item.marks,
      })),
    [data]
  );

  const downloadReport = async () => {
    try {
      const res = await api.get("/reports/student-report", {
        headers: { Authorization: `Bearer ${token}` },
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
    } catch (downloadError) {
      alert("Failed to download report");
      console.error(downloadError);
    }
  };

  const getStudentProfileObjectId = () => {
    return data?.student?._id || "";
  };

  const runPassFailPrediction = async () => {
    try {
      setMlError("");
      setMlLoading("pass-fail");

      const studentProfileObjectId = getStudentProfileObjectId();

      if (!studentProfileObjectId) {
        setMlError("Student profile ID not found");
        return;
      }

      const res = await predictPassFailRisk(studentProfileObjectId, {
        homework_pct: 75,
        study_hours_per_week: 8,
      });

      setPassFailPrediction(res.data);
    } catch (predictionError) {
      setMlError(
        predictionError.response?.data?.message ||
          "Failed to run Pass/Fail risk prediction"
      );
    } finally {
      setMlLoading("");
    }
  };

  const runCommercePrediction = async () => {
    try {
      setMlError("");
      setMlLoading("commerce");

      const studentProfileObjectId = getStudentProfileObjectId();

      if (!studentProfileObjectId) {
        setMlError("Student profile ID not found");
        return;
      }

      const subjectMarks = data?.subjectPerformance || [];

      const findSubjectMarks = (keyword, fallback) => {
        const matchedSubject = subjectMarks.find((item) =>
          item.subject?.toLowerCase().includes(keyword)
        );

        return matchedSubject?.marks ?? fallback;
      };

      const res = await predictCommerceRisk(studentProfileObjectId, {
        Accounting_Score: findSubjectMarks("account", 72),
        Business_Studies_Score: findSubjectMarks("business", 68),
        Economics_Score: findSubjectMarks("economic", 61),
        Attendance_Percentage: data?.attendancePercentage || 78,
      });

      setCommercePrediction(res.data);
    } catch (predictionError) {
      setMlError(
        predictionError.response?.data?.message ||
          "Failed to run Commerce risk prediction"
      );
    } finally {
      setMlLoading("");
    }
  };

  const childName = data?.student?.user?.fullName || "Child";
  const subjectList =
    data?.student?.subjects?.map((subject) => subject.subjectName).join(", ") ||
    "--";

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Parent Dashboard</h1>

          {data?.linkedChildren?.length > 1 ? (
            <label className="mt-3 block text-sm text-slate-600">
              Viewing Child:
              <select
                value={selectedStudentId}
                onChange={(event) => setSelectedStudentId(event.target.value)}
                className="ml-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800"
              >
                {data.linkedChildren.map((child) => (
                  <option key={child.studentId} value={child.studentId}>
                    {child.fullName}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="mt-2 text-sm text-slate-600">Viewing: {childName}</p>
          )}
        </div>

        <button
          type="button"
          onClick={downloadReport}
          className="w-fit rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Download Summary Report
        </button>
      </div>

      {error ? (
        <div className="mb-6 rounded-lg bg-red-100 p-4 text-red-700">{error}</div>
      ) : !data ? (
        <p>Loading...</p>
      ) : (
        <>
          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              title="Attendance"
              value={formatSummaryValue(data.attendancePercentage, "percent")}
            />
            <SummaryCard
              title="Risk Status"
              value={formatRiskStatus(data.riskStatus)}
            />
            <SummaryCard
              title="Latest Marks"
              value={
                data.latestResult
                  ? formatSummaryValue(data.latestResult.marks, "number")
                  : "--"
              }
            />
            <SummaryCard
              title="Latest Grade"
              value={formatSummaryValue(data.latestResult?.grade)}
            />
            <SummaryCard
              title="Overall Average"
              value={
                data.overallAverage !== null && data.overallAverage !== undefined
                  ? formatSummaryValue(data.overallAverage, "number")
                  : "--"
              }
            />
          </section>

          <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">{childName}</h2>
            <div className="mt-3 space-y-1 text-sm text-slate-600">
              <p>
                <span className="font-semibold text-slate-800">Student ID:</span>{" "}
                {data.student?.studentId || "--"}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Class:</span>{" "}
                {data.student?.class?.className || "--"}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Subjects:</span>{" "}
                {subjectList}
              </p>
            </div>
          </section>

          <Panel title="ML Risk Prediction">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  Pass/Fail Risk Model
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Predicts whether the student is likely to pass or fail.
                </p>

                <button
                  type="button"
                  onClick={runPassFailPrediction}
                  disabled={!getStudentProfileObjectId() || mlLoading === "pass-fail"}
                  className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {mlLoading === "pass-fail"
                    ? "Predicting..."
                    : "Run Pass/Fail Prediction"}
                </button>

                {passFailPrediction && (
                  <div className="mt-4 rounded-lg bg-white p-3 text-sm">
                    <p>
                      <span className="font-semibold">Result:</span>{" "}
                      {passFailPrediction.predicted_result}
                    </p>
                    <p>
                      <span className="font-semibold">Risk Level:</span>{" "}
                      {passFailPrediction.risk_level}
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  Commerce Risk Model
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Predicts High, Medium, or Low academic risk.
                </p>

                <button
                  type="button"
                  onClick={runCommercePrediction}
                  disabled={!getStudentProfileObjectId() || mlLoading === "commerce"}
                  className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {mlLoading === "commerce"
                    ? "Predicting..."
                    : "Run Commerce Prediction"}
                </button>

                {commercePrediction && (
                  <div className="mt-4 rounded-lg bg-white p-3 text-sm">
                    <p>
                      <span className="font-semibold">Risk Level:</span>{" "}
                      {commercePrediction.risk_level}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {mlError && (
              <div className="mt-4 rounded-lg bg-red-100 p-3 text-sm text-red-700">
                {mlError}
              </div>
            )}
          </Panel>

          <div className="mb-6 grid gap-4 xl:grid-cols-2">
            <Panel title="Important Alerts">
              {data.alerts?.length > 0 ? (
                <ul className="space-y-2 text-sm text-slate-700">
                  {data.alerts.map((alert, index) => (
                    <li key={index}>• {alert}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-600">
                  No important alerts at the moment.
                </p>
              )}
            </Panel>

            <Panel title="Attendance Overview">
              {data.attendanceSummary ? (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoStat
                    label="Present Days"
                    value={data.attendanceSummary.presentDays}
                  />
                  <InfoStat
                    label="Absent Days"
                    value={data.attendanceSummary.absentDays}
                  />
                  <InfoStat
                    label="Attendance Rate"
                    value={
                      data.attendanceSummary.attendanceRate > 0
                        ? `${data.attendanceSummary.attendanceRate}%`
                        : "--"
                    }
                  />
                  <InfoStat
                    label="Status"
                    value={data.attendanceSummary.status}
                  />
                </div>
              ) : (
                <p className="text-sm text-slate-600">
                  No attendance data available.
                </p>
              )}

              <Link
                to="/parent/attendance"
                className="mt-4 inline-flex rounded-lg border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                View Attendance Details
              </Link>
            </Panel>
          </div>

          <div className="mb-6 grid gap-4 xl:grid-cols-2">
            <Panel title="Recent Performance">
              {data.subjectPerformance?.length > 0 ? (
                <>
                  <div className="mb-4 space-y-2">
                    {data.subjectPerformance.map((item) => (
                      <div
                        key={item.subject}
                        className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2 text-sm"
                      >
                        <span className="font-medium text-slate-800">
                          {item.subject}
                        </span>
                        <span className="font-bold text-slate-900">
                          {item.marks}
                        </span>
                      </div>
                    ))}
                  </div>

                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="marks"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <p className="text-sm text-slate-600">
                  No examination performance data available.
                </p>
              )}

              <Link
                to="/parent/monthly-performance"
                className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                View Monthly Performance
              </Link>
            </Panel>

            <Panel title="Recommended Action">
              {data.recommendedAction ? (
                <>
                  <p className="font-semibold text-slate-900">
                    {data.recommendedAction.title}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {data.recommendedAction.message}
                  </p>
                  {data.recommendedAction.topics?.length > 0 && (
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                      {data.recommendedAction.topics.map((topic) => (
                        <li key={topic}>{topic}</li>
                      ))}
                    </ul>
                  )}
                  <Link
                    to="/parent/progress-reports"
                    className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    View Progress Report
                  </Link>
                </>
              ) : (
                <p className="text-sm text-slate-600">
                  No recommended actions at the moment.
                </p>
              )}
            </Panel>
          </div>

          <Panel
            title="Latest Results"
            action={
              <Link
                to="/parent/marks-rankings"
                className="text-sm font-semibold text-blue-700 hover:underline"
              >
                View Marks & Rankings
              </Link>
            }
          >
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-3 font-bold">Subject</th>
                    <th className="p-3 font-bold">Exam</th>
                    <th className="p-3 font-bold">Marks</th>
                    <th className="p-3 font-bold">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {recentResults.length === 0 ? (
                    <tr className="border-t">
                      <td colSpan={4} className="p-4 text-center text-slate-500">
                        No examination results available.
                      </td>
                    </tr>
                  ) : (
                    recentResults.map((result) => (
                      <tr key={result._id} className="border-t border-slate-200">
                        <td className="p-3">{getSubjectName(result)}</td>
                        <td className="p-3">{result.exam?.examName || "--"}</td>
                        <td className="p-3">{result.marks}</td>
                        <td className="p-3">{result.grade || "--"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Quick Actions">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.to}
                  to={action.to}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-800 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}

function SummaryCard({ title, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <h2 className="mt-2 text-3xl font-bold text-slate-900">{value}</h2>
    </div>
  );
}

function Panel({ title, children, action }) {
  return (
    <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function InfoStat({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value ?? "--"}</p>
    </div>
  );
}

export default ParentDashboard;