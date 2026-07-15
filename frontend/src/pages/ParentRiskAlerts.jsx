import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

// Default values are used only when real dashboard values are missing.
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
        error.response?.data?.message ||
          "Pass/Fail ML risk prediction failed"
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

      const commerceInput = {
        Accounting_Score: findSubjectMarks("account", 72),
        Business_Studies_Score: findSubjectMarks("business", 68),
        Economics_Score: findSubjectMarks("economic", 61),
        Attendance_Percentage: data?.attendancePercentage || 78,
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
        error.response?.data?.message ||
          "Commerce ML risk prediction failed"
      );
    } finally {
      setMlLoading("");
    }
  };

  if (loading) {
    return <div className="p-6 text-slate-600">Loading risk alerts...</div>;
  }

  if (pageError) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-100 p-4 text-red-700">
          {pageError}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          Parent Dashboard
        </p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Risk Alerts</h1>
        <p className="mt-2 text-slate-600">
          ML-based academic risk predictions for {childName}.
        </p>

        {data?.linkedChildren?.length > 1 && (
          <label className="mt-4 block text-sm text-slate-600">
            Viewing Child:
            <select
              value={selectedStudentId}
              onChange={(event) => {
                setSelectedStudentId(event.target.value);
                setPassFailPrediction(null);
                setCommercePrediction(null);
                setMlError("");
              }}
              className="ml-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800"
            >
              {data.linkedChildren.map((child) => (
                <option key={child.studentId} value={child.studentId}>
                  {child.fullName}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Student Summary</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <InfoCard label="Student" value={childName} />
          <InfoCard label="Student ID" value={data?.student?.studentId} />
          <InfoCard
            label="Attendance"
            value={
              data?.attendancePercentage
                ? `${data.attendancePercentage}%`
                : "--"
            }
          />
          <InfoCard label="Current Risk" value={data?.riskStatus || "--"} />
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">ML Risk Prediction</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <PredictionCard
            title="Pass/Fail Risk Model"
            description="Predicts whether the student is likely to pass or fail."
            buttonText="Run Pass/Fail Prediction"
            loadingText="Predicting..."
            color="blue"
            isLoading={mlLoading === "pass-fail"}
            onClick={runPassFailPrediction}
          >
            {passFailPrediction && (
              <ResultBox>
                <p>
                  <span className="font-semibold">Result:</span>{" "}
                  {passFailPrediction.predicted_result}
                </p>
                <p>
                  <span className="font-semibold">Risk Level:</span>{" "}
                  {passFailPrediction.risk_level}
                </p>
              </ResultBox>
            )}
          </PredictionCard>

          <PredictionCard
            title="Commerce Risk Model"
            description="Predicts High, Medium, or Low academic risk for A/L Commerce."
            buttonText="Run Commerce Prediction"
            loadingText="Predicting..."
            color="emerald"
            isLoading={mlLoading === "commerce"}
            onClick={runCommercePrediction}
          >
            {commercePrediction && (
              <ResultBox>
                <p>
                  <span className="font-semibold">Risk Level:</span>{" "}
                  {commercePrediction.risk_level}
                </p>
              </ResultBox>
            )}
          </PredictionCard>
        </div>

        {mlError && (
          <div className="mt-4 rounded-lg bg-red-100 p-3 text-sm text-red-700">
            {mlError}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Important Alerts</h2>

        {data?.alerts?.length > 0 ? (
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {data.alerts.map((alert, index) => (
              <li key={index}>• {alert}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-600">
            No important alerts at the moment.
          </p>
        )}
      </section>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 font-bold text-slate-900">{value || "--"}</p>
    </div>
  );
}

function PredictionCard({
  title,
  description,
  buttonText,
  loadingText,
  color,
  isLoading,
  onClick,
  children,
}) {
  const buttonClass =
    color === "emerald"
      ? "bg-emerald-600 hover:bg-emerald-700"
      : "bg-blue-600 hover:bg-blue-700";

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{description}</p>

      <button
        type="button"
        onClick={onClick}
        disabled={isLoading}
        className={`mt-4 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400 ${buttonClass}`}
      >
        {isLoading ? loadingText : buttonText}
      </button>

      {children}
    </div>
  );
}

function ResultBox({ children }) {
  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
      {children}
    </div>
  );
}

export default ParentRiskAlerts;