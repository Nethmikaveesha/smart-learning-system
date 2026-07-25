import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

// These values are used only when the system does not have enough real data.
// Real attendance and subject marks are taken from the parent dashboard API.
const DEFAULT_PASS_FAIL_INPUT = {
  homework_pct: 75,
  study_hours_per_week: 8,
};

function ParentRiskAlerts() {
  const { token } = useAuth();

  const [data, setData] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [mlLoading, setMlLoading] = useState("");
  const [mlError, setMlError] = useState("");
  const [passFailPrediction, setPassFailPrediction] = useState(null);
  const [commercePrediction, setCommercePrediction] = useState(null);

  useEffect(() => {
    const fetchParentDashboard = async () => {
      try {
        setLoading(true);
        setPageError("");

        const params = selectedStudentId ? { studentId: selectedStudentId } : {};

        const res = await api.get("/parent-dashboard", {
          headers: { Authorization: `Bearer ${token}` },
          params,
        });

        setData(res.data);

        if (!selectedStudentId && res.data.selectedStudentId) {
          setSelectedStudentId(res.data.selectedStudentId);
        }
      } catch (error) {
        setPageError(
          error.response?.data?.message || "Failed to load risk alert data"
        );
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchParentDashboard();
  }, [token, selectedStudentId]);

  const studentProfileObjectId = data?.student?._id || "";
  const childName = data?.student?.user?.fullName || "Student";
  const studentCode = data?.student?.studentId || "--";
  const className = data?.student?.class?.className || "--";
  const attendanceValue = data?.attendancePercentage || 0;
  const currentRisk = formatRiskLabel(data?.riskStatus);

  const subjectMarks = useMemo(() => data?.subjectPerformance || [], [data]);

  const findSubjectMarks = (keyword, fallback) => {
    const matchedSubject = subjectMarks.find((item) =>
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

      const res = await api.post(
        `/risk/final-predict-auto/${studentProfileObjectId}`,
        DEFAULT_PASS_FAIL_INPUT,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setPassFailPrediction(res.data);
    } catch (error) {
      setMlError(
        error.response?.data?.message || "Pass / fail progress check failed"
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

      // Commerce model uses A/L Commerce subject marks and attendance.
      const commerceInput = {
        Accounting_Score: findSubjectMarks("account", 72),
        Business_Studies_Score: findSubjectMarks("business", 68),
        Economics_Score: findSubjectMarks("economic", 61),
        Attendance_Percentage: attendanceValue || 78,
      };

      const res = await api.post(
        `/risk/multi-class-predict-auto/${studentProfileObjectId}`,
        commerceInput,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setCommercePrediction(res.data);
    } catch (error) {
      setMlError(
        error.response?.data?.message || "Subject progress check failed"
      );
    } finally {
      setMlLoading("");
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="typo-ui text-slate-600">
            Loading risk alerts...
          </p>
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
          {pageError}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        childName={childName}
        selectedStudentId={selectedStudentId}
        linkedChildren={data?.linkedChildren || []}
        onChildChange={(value) => {
          setSelectedStudentId(value);
          setPassFailPrediction(null);
          setCommercePrediction(null);
          setMlError("");
        }}
      />

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Student" value={childName} />
        <SummaryCard label="Student ID" value={studentCode} />
        <SummaryCard label="Class" value={className} />
        <SummaryCard
          label="Current Risk"
          value={currentRisk}
          badgeClass={getRiskBadgeClass(currentRisk)}
        />
      </section>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="typo-card text-slate-950">
              Academic Progress Check
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Review the latest attendance, marks, and subject performance to
              see where extra support may help.
            </p>
          </div>

          <span className="w-fit rounded-full bg-blue-50 px-3 py-1 typo-eyebrow text-blue-700">
            Progress Screening
          </span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <PredictionCard
            title="Pass / Fail Outlook"
            description="Estimates whether the student is on track to pass or may need support."
            meta="Uses attendance, homework, midterm score, and study hours."
            buttonText="Check Pass / Fail Outlook"
            loadingText="Checking..."
            color="blue"
            isLoading={mlLoading === "pass-fail"}
            disabled={!studentProfileObjectId}
            onClick={runPassFailPrediction}
          >
            {passFailPrediction && (
              <PredictionResult
                title="Pass / Fail Result"
                rows={[
                  {
                    label: "Likely Result",
                    value: passFailPrediction.predicted_result,
                  },
                  {
                    label: "Support Level",
                    value: passFailPrediction.risk_level,
                    badgeClass: getRiskBadgeClass(passFailPrediction.risk_level),
                  },
                ]}
              />
            )}
          </PredictionCard>

          <PredictionCard
            title="Subject Progress Check"
            description="Estimates High, Medium, or Low support need for A/L Commerce subjects."
            meta="Uses Accounting, Business Studies, Economics, and attendance."
            buttonText="Check Subject Progress"
            loadingText="Checking..."
            color="emerald"
            isLoading={mlLoading === "commerce"}
            disabled={!studentProfileObjectId}
            onClick={runCommercePrediction}
          >
            {commercePrediction && (
              <PredictionResult
                title="Subject Progress Result"
                rows={[
                  {
                    label: "Support Level",
                    value: commercePrediction.risk_level,
                    badgeClass: getRiskBadgeClass(commercePrediction.risk_level),
                  },
                ]}
              />
            )}
          </PredictionCard>
        </div>

        {mlError && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {mlError}
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="Academic Signals">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoStat
              label="Attendance Percentage"
              value={attendanceValue ? `${attendanceValue}%` : "--"}
            />
            <InfoStat label="Overall Average" value={data?.overallAverage} />
            <InfoStat
              label="Latest Marks"
              value={data?.latestResult?.marks ?? "--"}
            />
            <InfoStat
              label="Latest Grade"
              value={data?.latestResult?.grade || "--"}
            />
          </div>
        </Panel>

        <Panel title="Important Alerts">
          {data?.alerts?.length > 0 ? (
            <ul className="space-y-2 text-sm text-slate-700">
              {data.alerts.map((alert, index) => (
                <li
                  key={index}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-medium text-amber-800"
                >
                  {alert}
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-800">
                No important alerts at the moment.
              </p>
              <p className="mt-1 text-sm text-emerald-700">
                The student is currently not flagged by dashboard rules.
              </p>
            </div>
          )}
        </Panel>
      </section>
    </div>
  );
}

function PageHeader({
  childName,
  linkedChildren,
  selectedStudentId,
  onChildChange,
}) {
  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="typo-eyebrow text-blue-700">
            Parent Dashboard
          </p>
          <h1 className="mt-2 typo-page text-slate-950">
            Risk Alerts
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Review alerts and check academic progress outlook for {childName}.
          </p>
        </div>

        {linkedChildren.length > 1 && (
          <label className="typo-ui text-slate-600">
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
      </div>
    </div>
  );
}

function SummaryCard({ label, value, badgeClass }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="typo-eyebrow text-slate-400">
        {label}
      </p>

      {badgeClass ? (
        <span
          className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${badgeClass}`}
        >
          {value || "--"}
        </span>
      ) : (
        <p className="mt-3 truncate typo-card text-slate-950">
          {value || "--"}
        </p>
      )}
    </div>
  );
}

function PredictionCard({
  title,
  description,
  meta,
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
      <div className="min-h-28">
        <h3 className="text-base font-semibold text-slate-950">{title}</h3>
        <p className="mt-2 typo-body text-slate-600">{description}</p>
        <p className="mt-2 text-xs font-semibold text-slate-500">{meta}</p>
      </div>

      <button
        type="button"
        onClick={onClick}
        disabled={disabled || isLoading}
        className={`mt-4 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:bg-slate-400 ${buttonClass}`}
      >
        {isLoading ? loadingText : buttonText}
      </button>

      {children}
    </div>
  );
}

function PredictionResult({ title, rows }) {
  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-950">{title}</p>

      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="text-slate-500">{row.label}</span>

            {row.badgeClass ? (
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${row.badgeClass}`}
              >
                {row.value || "--"}
              </span>
            ) : (
              <span className="font-semibold text-slate-950">
                {row.value || "--"}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 typo-card text-slate-950">{title}</h2>
      {children}
    </section>
  );
}

function InfoStat({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 typo-card text-slate-950">
        {value ?? "--"}
      </p>
    </div>
  );
}

function formatRiskLabel(status) {
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

export default ParentRiskAlerts;