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

// Parent dashboard shortcut links.
const QUICK_ACTIONS = [
  { label: "Child Overview", to: "/parent/child-overview" },
  { label: "Marks & Rankings", to: "/parent/marks-rankings" },
  { label: "Attendance", to: "/parent/attendance" },
  { label: "Risk Alerts", to: "/parent/risk-alerts" },
  { label: "Progress Reports", to: "/parent/progress-reports" },
];

// These fallback values are only used if the backend does not have enough data.
const DEFAULT_PASS_FAIL_INPUT = {
  homework_pct: 75,
  study_hours_per_week: 8,
};

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

  const childName = data?.student?.user?.fullName || "Child";
  const studentProfileObjectId = data?.student?._id || "";

  const subjectList =
    data?.student?.subjects?.map((subject) => subject.subjectName).join(", ") ||
    "--";

  const recentResults = useMemo(() => data?.results?.slice(0, 4) || [], [data]);

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

  const findSubjectMarks = (keyword, fallback) => {
    const matchedSubject = data?.subjectPerformance?.find((item) =>
      item.subject?.toLowerCase().includes(keyword)
    );

    return matchedSubject?.marks ?? fallback;
  };

  const runPassFailPrediction = async () => {
    try {
      setMlError("");
      setMlLoading("pass-fail");

      if (!studentProfileObjectId) {
        setMlError("Student profile ID not found");
        return;
      }

      const res = await predictPassFailRisk(
        studentProfileObjectId,
        DEFAULT_PASS_FAIL_INPUT
      );

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

      if (!studentProfileObjectId) {
        setMlError("Student profile ID not found");
        return;
      }

      // Commerce model expects A/L Commerce marks and attendance percentage.
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

  return (
    <div className="p-6">
      <DashboardHeader
        childName={childName}
        linkedChildren={data?.linkedChildren || []}
        selectedStudentId={selectedStudentId}
        onChildChange={(value) => {
          setSelectedStudentId(value);
          setPassFailPrediction(null);
          setCommercePrediction(null);
          setMlError("");
        }}
        onDownloadReport={downloadReport}
      />

      {error ? (
        <AlertBox type="error" message={error} />
      ) : !data ? (
        <LoadingPanel />
      ) : (
        <>
          <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              label="Attendance"
              value={formatPercent(data.attendancePercentage)}
            />
            <MetricCard
              label="Risk Status"
              value={formatRiskStatus(data.riskStatus)}
              badgeClass={getRiskBadgeClass(formatRiskStatus(data.riskStatus))}
            />
            <MetricCard
              label="Latest Marks"
              value={
                data.latestResult
                  ? formatSummaryValue(data.latestResult.marks, "number")
                  : "--"
              }
            />
            <MetricCard
              label="Latest Grade"
              value={formatSummaryValue(data.latestResult?.grade)}
            />
            <MetricCard
              label="Overall Average"
              value={
                data.overallAverage !== null && data.overallAverage !== undefined
                  ? formatSummaryValue(data.overallAverage, "number")
                  : "--"
              }
            />
          </section>

          <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Student Profile
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                  {childName}
                </h2>

                <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                  <ProfileItem
                    label="Student ID"
                    value={data.student?.studentId}
                  />
                  <ProfileItem
                    label="Class"
                    value={data.student?.class?.className}
                  />
                  <ProfileItem label="Subjects" value={subjectList} />
                </div>
              </div>

              <Link
                to="/parent/child-overview"
                className="w-fit rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 transition hover:bg-blue-100"
              >
                View Child Overview
              </Link>
            </div>
          </section>

          <Panel
            title="ML Risk Prediction"
            description="Run machine-learning predictions using the latest academic and attendance data."
            action={
              <Link
                to="/parent/risk-alerts"
                className="text-sm font-black text-blue-700 hover:underline"
              >
                Open Risk Alerts
              </Link>
            }
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <PredictionCard
                title="Pass/Fail Risk Model"
                description="Predicts whether the student is likely to pass or fail."
                buttonText="Run Pass/Fail Prediction"
                loadingText="Predicting..."
                color="blue"
                isLoading={mlLoading === "pass-fail"}
                disabled={!studentProfileObjectId}
                onClick={runPassFailPrediction}
              >
                {passFailPrediction && (
                  <PredictionResult
                    rows={[
                      {
                        label: "Result",
                        value: passFailPrediction.predicted_result,
                      },
                      {
                        label: "Risk Level",
                        value: passFailPrediction.risk_level,
                        badgeClass: getRiskBadgeClass(
                          passFailPrediction.risk_level
                        ),
                      },
                    ]}
                  />
                )}
              </PredictionCard>

              <PredictionCard
                title="Commerce Risk Model"
                description="Predicts High, Medium, or Low academic risk for A/L Commerce."
                buttonText="Run Commerce Prediction"
                loadingText="Predicting..."
                color="emerald"
                isLoading={mlLoading === "commerce"}
                disabled={!studentProfileObjectId}
                onClick={runCommercePrediction}
              >
                {commercePrediction && (
                  <PredictionResult
                    rows={[
                      {
                        label: "Risk Level",
                        value: commercePrediction.risk_level,
                        badgeClass: getRiskBadgeClass(
                          commercePrediction.risk_level
                        ),
                      },
                    ]}
                  />
                )}
              </PredictionCard>
            </div>

            {mlError && <AlertBox type="error" message={mlError} compact />}
          </Panel>

          <div className="mb-6 grid gap-4 xl:grid-cols-2">
            <Panel title="Important Alerts">
              {data.alerts?.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {data.alerts.map((alert, index) => (
                    <li
                      key={index}
                      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-semibold text-amber-800"
                    >
                      {alert}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title="No important alerts"
                  message="The student is not currently flagged by dashboard rules."
                />
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
                  <InfoStat label="Status" value={data.attendanceSummary.status} />
                </div>
              ) : (
                <EmptyState
                  title="No attendance data"
                  message="Attendance records will appear after teachers mark attendance."
                />
              )}

              <Link
                to="/parent/attendance"
                className="mt-4 inline-flex rounded-lg bg-blue-700 px-4 py-2 text-sm font-black text-white transition hover:bg-blue-800"
              >
                View Attendance Details
              </Link>
            </Panel>
          </div>

          <div className="mb-6 grid gap-4 xl:grid-cols-2">
            <Panel title="Subject Performance">
              {data.subjectPerformance?.length > 0 ? (
                <>
                  <div className="mb-4 space-y-2">
                    {data.subjectPerformance.map((item) => (
                      <div
                        key={item.subject}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                      >
                        <span className="font-bold text-slate-700">
                          {item.subject}
                        </span>
                        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
                          {item.marks}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="marks"
                          stroke="#2563eb"
                          strokeWidth={3}
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <EmptyState
                  title="No subject performance"
                  message="Subject performance will appear after exam results are added."
                />
              )}
            </Panel>

            <Panel title="Recommended Action">
              {data.recommendedAction ? (
                <>
                  <p className="text-base font-black text-slate-950">
                    {data.recommendedAction.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {data.recommendedAction.message}
                  </p>

                  {data.recommendedAction.topics?.length > 0 && (
                    <ul className="mt-4 space-y-2 text-sm text-slate-700">
                      {data.recommendedAction.topics.map((topic) => (
                        <li
                          key={topic}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-semibold"
                        >
                          {topic}
                        </li>
                      ))}
                    </ul>
                  )}

                  <Link
                    to="/parent/progress-reports"
                    className="mt-4 inline-flex rounded-lg bg-blue-700 px-4 py-2 text-sm font-black text-white transition hover:bg-blue-800"
                  >
                    View Progress Report
                  </Link>
                </>
              ) : (
                <EmptyState
                  title="No recommended action"
                  message="Recommendations will appear when the system detects academic concerns."
                />
              )}
            </Panel>
          </div>

          <Panel
            title="Latest Results"
            action={
              <Link
                to="/parent/marks-rankings"
                className="text-sm font-black text-blue-700 hover:underline"
              >
                View All Results
              </Link>
            }
          >
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-3 font-black">Subject</th>
                    <th className="p-3 font-black">Exam</th>
                    <th className="p-3 font-black">Marks</th>
                    <th className="p-3 font-black">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {recentResults.length === 0 ? (
                    <tr className="border-t">
                      <td colSpan={4} className="p-5 text-center text-slate-500">
                        No examination results available.
                      </td>
                    </tr>
                  ) : (
                    recentResults.map((result) => (
                      <tr
                        key={result._id}
                        className="border-t border-slate-200 bg-white"
                      >
                        <td className="p-3 font-semibold text-slate-800">
                          {getSubjectName(result)}
                        </td>
                        <td className="p-3 text-slate-600">
                          {result.exam?.examName || "--"}
                        </td>
                        <td className="p-3 font-black text-slate-950">
                          {result.marks}
                        </td>
                        <td className="p-3">
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                            {result.grade || "--"}
                          </span>
                        </td>
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
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-sm font-black text-slate-800 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
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

function DashboardHeader({
  childName,
  linkedChildren,
  selectedStudentId,
  onChildChange,
  onDownloadReport,
}) {
  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
            Parent Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            {childName}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Monitor academic progress, attendance, alerts, and ML-based risk
            predictions from one place.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {linkedChildren.length > 1 && (
            <label className="text-sm font-semibold text-slate-600">
              Viewing Child
              <select
                value={selectedStudentId}
                onChange={(event) => onChildChange(event.target.value)}
                className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-sm"
              >
                {linkedChildren.map((child) => (
                  <option key={child.studentId} value={child.studentId}>
                    {child.fullName}
                  </option>
                ))}
              </select>
            </label>
          )}

          <button
            type="button"
            onClick={onDownloadReport}
            className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-blue-800"
          >
            Download Report
          </button>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, badgeClass }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>

      {badgeClass ? (
        <span
          className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-black ${badgeClass}`}
        >
          {value || "--"}
        </span>
      ) : (
        <h2 className="mt-3 truncate text-2xl font-black text-slate-950">
          {value || "--"}
        </h2>
      )}
    </div>
  );
}

function ProfileItem({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-bold text-slate-800">{value || "--"}</p>
    </div>
  );
}

function Panel({ title, description, children, action }) {
  return (
    <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-950">{title}</h2>
          {description && (
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function PredictionCard({
  title,
  description,
  buttonText,
  loadingText,
  color,
  isLoading,
  disabled,
  onClick,
  children,
}) {
  const buttonClass =
    color === "emerald"
      ? "bg-emerald-600 hover:bg-emerald-700"
      : "bg-blue-700 hover:bg-blue-800";

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="text-base font-black text-slate-950">{title}</h3>
      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">
        {description}
      </p>

      <button
        type="button"
        onClick={onClick}
        disabled={disabled || isLoading}
        className={`mt-4 rounded-lg px-4 py-2.5 text-sm font-black text-white shadow-sm transition disabled:cursor-not-allowed disabled:bg-slate-400 ${buttonClass}`}
      >
        {isLoading ? loadingText : buttonText}
      </button>

      {children}
    </div>
  );
}

function PredictionResult({ rows }) {
  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="text-slate-500">{row.label}</span>

            {row.badgeClass ? (
              <span
                className={`rounded-full px-3 py-1 text-xs font-black ${row.badgeClass}`}
              >
                {row.value || "--"}
              </span>
            ) : (
              <span className="font-black text-slate-950">
                {row.value || "--"}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoStat({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-lg font-black text-slate-950">
        {value ?? "--"}
      </p>
    </div>
  );
}

function AlertBox({ message, compact = false }) {
  return (
    <div
      className={`rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-700 ${
        compact ? "mt-5 p-4" : "mb-6 p-5"
      }`}
    >
      {message}
    </div>
  );
}

function EmptyState({ title, message }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-black text-slate-800">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">{message}</p>
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-600">
        Loading parent dashboard...
      </p>
    </div>
  );
}

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

function formatPercent(value) {
  const numericValue = Number(value);
  return numericValue > 0 ? `${formatMarks(numericValue)}%` : "--";
}

function formatRiskStatus(status) {
  if (!status) return "--";
  if (status === "Low") return "Low Risk";
  if (status === "Medium") return "Medium Risk";
  if (status === "High") return "High Risk";
  return status;
}

function getRiskBadgeClass(status) {
  const normalizedStatus = String(status || "").toLowerCase();

  if (normalizedStatus.includes("high")) {
    return "bg-red-100 text-red-700";
  }

  if (normalizedStatus.includes("medium")) {
    return "bg-amber-100 text-amber-700";
  }

  if (normalizedStatus.includes("low") || normalizedStatus.includes("pass")) {
    return "bg-emerald-100 text-emerald-700";
  }

  return "bg-slate-100 text-slate-700";
}

function getSubjectName(result) {
  return (
    result.exam?.subject?.subjectName ||
    result.exam?.examName?.split(" - ").pop() ||
    "General"
  );
}

export default ParentDashboard;