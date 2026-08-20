import { useEffect, useMemo, useState } from "react";
import api, {
  getStudentCommerceRiskHistory,
  predictCommerceRisk,
} from "../services/api";
import { useAuth } from "../context/AuthContext";

/**
 * Student-facing Commerce risk assessment page.
 * Uses the same auto-predict + history APIs as the parent risk alerts screen,
 * scoped to the logged-in student's own StudentProfile.
 */
function StudentCommerceRisk() {
  const { token } = useAuth();

  const [profileId, setProfileId] = useState("");
  const [subjectPerformance, setSubjectPerformance] = useState([]);
  const [attendancePercentage, setAttendancePercentage] = useState(null);
  const [riskStatus, setRiskStatus] = useState("");
  const [history, setHistory] = useState([]);
  const [prediction, setPrediction] = useState(null);

  const [loading, setLoading] = useState(true);
  const [mlLoading, setMlLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [mlError, setMlError] = useState("");

  useEffect(() => {
    if (!token) return undefined;

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setPageError("");

        const dashboardRes = await api.get("/student-dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (cancelled) return;

        const student = dashboardRes.data?.student;
        const id = student?._id || "";
        setProfileId(id);
        setSubjectPerformance(dashboardRes.data?.subjectPerformance || []);
        setAttendancePercentage(dashboardRes.data?.attendancePercentage ?? null);
        setRiskStatus(dashboardRes.data?.riskStatus || student?.riskStatus || "");

        if (!id) {
          setHistory([]);
          return;
        }

        const historyRes = await getStudentCommerceRiskHistory(id);
        if (cancelled) return;

        const rows = historyRes.data?.data || [];
        setHistory(rows);
        if (rows[0]) {
          setPrediction({
            risk_level: rows[0].riskLevel,
            saved_data: rows[0],
          });
        }
      } catch (error) {
        if (!cancelled) {
          setPageError(
            error.response?.data?.message ||
              "Failed to load risk assessment data"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const subjectSnapshot = useMemo(() => {
    const findMarks = (keyword) => {
      const matched = subjectPerformance.find((item) =>
        item.subject?.toLowerCase().includes(keyword)
      );
      return matched?.marks ?? null;
    };

    return {
      accounting: findMarks("account"),
      business: findMarks("business"),
      economics: findMarks("economic"),
    };
  }, [subjectPerformance]);

  const runCommercePrediction = async () => {
    try {
      setMlError("");
      setMlLoading(true);

      if (!profileId) {
        setMlError("Student profile ID not found");
        return;
      }

      const { accounting, business, economics } = subjectSnapshot;

      if (accounting == null || business == null || economics == null) {
        setMlError(
          "Accounting, Business Studies and Economics marks are required before running a risk assessment"
        );
        return;
      }

      if (!attendancePercentage) {
        setMlError(
          "Attendance records are required before running a risk assessment"
        );
        return;
      }

      const res = await predictCommerceRisk(profileId, {
        Accounting_Score: accounting,
        Business_Studies_Score: business,
        Economics_Score: economics,
        Attendance_Percentage: attendancePercentage,
      });

      setPrediction(res.data);
      setRiskStatus(res.data?.risk_level || riskStatus);

      const historyRes = await getStudentCommerceRiskHistory(profileId);
      setHistory(historyRes.data?.data || []);
    } catch (error) {
      setMlError(
        error.response?.data?.message ||
          "Failed to run risk assessment"
      );
    } finally {
      setMlLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="typo-ui text-slate-600">Loading risk assessment...</p>
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
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="typo-eyebrow text-blue-700">Student Progress</p>
        <h1 className="mt-2 typo-page text-slate-950">Commerce Risk Assessment</h1>
        <p className="mt-2 max-w-3xl typo-body text-slate-600">
          Reviews your Accounting, Business Studies, Economics marks and
          attendance to show whether you may need extra academic support.
        </p>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Current Risk"
          value={formatRiskLabel(riskStatus || prediction?.risk_level)}
          badgeClass={getRiskBadgeClass(
            riskStatus || prediction?.risk_level
          )}
        />
        <SummaryCard
          label="Accounting"
          value={subjectSnapshot.accounting ?? "--"}
        />
        <SummaryCard
          label="Business Studies"
          value={subjectSnapshot.business ?? "--"}
        />
        <SummaryCard
          label="Economics"
          value={subjectSnapshot.economics ?? "--"}
        />
      </section>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="typo-card text-slate-950">Run assessment</h2>
            <p className="mt-1 text-sm text-slate-600">
              Uses your saved subject marks and attendance. Results are kept in
              your progress history.
            </p>
            <p className="mt-2 text-xs font-semibold text-slate-500">
              Attendance:{" "}
              {attendancePercentage != null ? `${attendancePercentage}%` : "--"}
            </p>
          </div>

          <button
            type="button"
            onClick={runCommercePrediction}
            disabled={!profileId || mlLoading}
            className="w-fit rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {mlLoading ? "Checking..." : "Check Progress Risk"}
          </button>
        </div>

        {mlError && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {mlError}
          </div>
        )}

        {prediction && (
          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-950">
              Latest assessment result
            </p>
            <div className="mt-3 flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-500">Support Level</span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${getRiskBadgeClass(
                  prediction.risk_level
                )}`}
              >
                {prediction.risk_level || "--"}
              </span>
            </div>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Risk assessment history
          </h2>
        </div>

        {history.length === 0 ? (
          <p className="p-5 text-sm text-slate-600">
            No risk assessments saved yet. Run a check above after Accounting,
            Business Studies, Economics marks and attendance are available.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white text-slate-600">
                <tr>
                  <th className="px-3 py-2">Risk</th>
                  <th className="px-3 py-2">ACC</th>
                  <th className="px-3 py-2">BS</th>
                  <th className="px-3 py-2">ECO</th>
                  <th className="px-3 py-2">Attendance</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row._id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-semibold">{row.riskLevel}</td>
                    <td className="px-3 py-2">
                      {row.inputData?.accountingScore ?? "--"}
                    </td>
                    <td className="px-3 py-2">
                      {row.inputData?.businessStudiesScore ?? "--"}
                    </td>
                    <td className="px-3 py-2">
                      {row.inputData?.economicsScore ?? "--"}
                    </td>
                    <td className="px-3 py-2">
                      {row.inputData?.attendancePercentage != null
                        ? `${row.inputData.attendancePercentage}%`
                        : "--"}
                    </td>
                    <td className="px-3 py-2">
                      {row.predictionSource || "Automatic"}
                    </td>
                    <td className="px-3 py-2">
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleString("en-GB")
                        : "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ label, value, badgeClass }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="typo-eyebrow text-slate-400">{label}</p>
      {badgeClass ? (
        <span
          className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${badgeClass}`}
        >
          {value || "--"}
        </span>
      ) : (
        <p className="mt-3 truncate typo-card text-slate-950">{value ?? "--"}</p>
      )}
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

export default StudentCommerceRisk;
