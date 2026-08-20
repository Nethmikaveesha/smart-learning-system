import { useEffect, useMemo, useState } from "react";
import api, { getCommerceRisks, predictCommerceRisk } from "../services/api";
import { useAuth } from "../context/AuthContext";

function RiskDashboard() {
  const { token } = useAuth();
  const [xapiRisks, setXapiRisks] = useState([]);
  const [finalRisks, setFinalRisks] = useState([]);
  const [commerceRisks, setCommerceRisks] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [runLoading, setRunLoading] = useState(false);
  const [runMessage, setRunMessage] = useState("");
  const [loading, setLoading] = useState(() => Boolean(token));
  const [error, setError] = useState(() =>
    token ? "" : "Please sign in as admin or teacher to view risk records."
  );

  const fetchRiskData = async () => {
    try {
      setLoading(true);
      setError("");

      const headers = { Authorization: `Bearer ${token}` };
      const [xapiResponse, finalResponse, commerceResponse, profilesResponse] =
        await Promise.all([
          api.get("/risk", { headers }),
          api.get("/risk/final", { headers }),
          getCommerceRisks(),
          api.get("/student-profiles", { headers }),
        ]);

      setXapiRisks(xapiResponse.data.data || []);
      setFinalRisks(finalResponse.data.data || []);
      setCommerceRisks(commerceResponse.data.data || []);
      setProfiles(Array.isArray(profilesResponse.data) ? profilesResponse.data : []);
    } catch (err) {
      console.error("Failed to fetch risk data:", err);
      setError(
        err.response?.data?.message || "Failed to load risk assessment data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return undefined;

    let cancelled = false;
    (async () => {
      try {
        if (!cancelled) {
          setLoading(true);
          setError("");
        }
        const headers = { Authorization: `Bearer ${token}` };
        const [xapiResponse, finalResponse, commerceResponse, profilesResponse] =
          await Promise.all([
            api.get("/risk", { headers }),
            api.get("/risk/final", { headers }),
            getCommerceRisks(),
            api.get("/student-profiles", { headers }),
          ]);
        if (cancelled) return;
        setXapiRisks(xapiResponse.data.data || []);
        setFinalRisks(finalResponse.data.data || []);
        setCommerceRisks(commerceResponse.data.data || []);
        setProfiles(
          Array.isArray(profilesResponse.data) ? profilesResponse.data : []
        );
      } catch (err) {
        if (cancelled) return;
        setError(
          err.response?.data?.message || "Failed to load risk assessment data."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const runStaffCommercePrediction = async () => {
    if (!selectedProfileId) {
      setRunMessage("Select a student profile first.");
      return;
    }

    try {
      setRunLoading(true);
      setRunMessage("");
      const res = await predictCommerceRisk(selectedProfileId);
      setRunMessage(
        `Risk assessment result: ${res.data?.risk_level || "saved"}`
      );
      await fetchRiskData();
    } catch (err) {
      setRunMessage(
        err.response?.data?.message || "Commerce prediction failed"
      );
    } finally {
      setRunLoading(false);
    }
  };

  const xapiSummary = useMemo(
    () => ({
      total: xapiRisks.length,
      high: xapiRisks.filter((item) => item.riskLevel === "High Risk").length,
      medium: xapiRisks.filter((item) => item.riskLevel === "Medium Risk").length,
      low: xapiRisks.filter((item) => item.riskLevel === "Low Risk").length,
    }),
    [xapiRisks]
  );

  const finalSummary = useMemo(
    () => ({
      total: finalRisks.length,
      pass: finalRisks.filter((item) => item.predictedResult === "Pass").length,
      fail: finalRisks.filter((item) => item.predictedResult === "Fail").length,
      high: finalRisks.filter((item) => item.riskLevel === "High Risk").length,
      low: finalRisks.filter((item) => item.riskLevel === "Low Risk").length,
    }),
    [finalRisks]
  );

  const commerceSummary = useMemo(
    () => ({
      total: commerceRisks.length,
      high: commerceRisks.filter((item) => item.riskLevel === "High Risk").length,
      medium: commerceRisks.filter((item) => item.riskLevel === "Medium Risk")
        .length,
      low: commerceRisks.filter((item) => item.riskLevel === "Low Risk").length,
    }),
    [commerceRisks]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="typo-ui text-slate-600">
            Loading risk assessment dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <PageHeader onRefresh={fetchRiskData} />

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <ModelSection
          title="Learning Engagement Overview"
          description="Uses learning behaviour and engagement signals for an optional comparison view."
          summary={[
            { label: "Total Checks", value: xapiSummary.total },
            {
              label: "High Risk",
              value: xapiSummary.high,
              badgeClass: "bg-red-100 text-red-700",
            },
            {
              label: "Medium Risk",
              value: xapiSummary.medium,
              badgeClass: "bg-amber-100 text-amber-700",
            },
            {
              label: "Low Risk",
              value: xapiSummary.low,
              badgeClass: "bg-emerald-100 text-emerald-700",
            },
          ]}
        >
          <XapiRiskTable risks={xapiRisks} />
        </ModelSection>

        <ModelSection
          title="Commerce Risk Assessment"
          description="Uses Accounting, Business Studies, Economics marks and attendance to flag High, Medium, or Low support need."
          summary={[
            { label: "Total Assessments", value: commerceSummary.total },
            {
              label: "High Risk",
              value: commerceSummary.high,
              badgeClass: "bg-red-100 text-red-700",
            },
            {
              label: "Medium Risk",
              value: commerceSummary.medium,
              badgeClass: "bg-amber-100 text-amber-700",
            },
            {
              label: "Low Risk",
              value: commerceSummary.low,
              badgeClass: "bg-emerald-100 text-emerald-700",
            },
          ]}
        >
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">
              Run risk assessment (staff)
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Uses saved Accounting, Business Studies, and Economics marks with
              attendance for the selected student. The result is saved to risk
              history.
            </p>
            <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end">
              <label className="flex-1 text-xs font-semibold text-slate-600">
                Student
                <select
                  value={selectedProfileId}
                  onChange={(event) => setSelectedProfileId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800"
                >
                  <option value="">Select student profile</option>
                  {profiles.map((profile) => (
                    <option key={profile._id} value={profile._id}>
                      {profile.user?.fullName || "Student"} (
                      {profile.studentId || profile._id})
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={runStaffCommercePrediction}
                disabled={runLoading || !selectedProfileId}
                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {runLoading ? "Running..." : "Run assessment"}
              </button>
            </div>
            {runMessage && (
              <p className="mt-3 text-sm font-medium text-slate-700">
                {runMessage}
              </p>
            )}
          </div>
          <CommerceRiskTable risks={commerceRisks} />
        </ModelSection>

        <ModelSection
          title="Pass/Fail Outlook"
          description="Uses attendance and academic indicators to estimate likely pass or fail support need."
          summary={[
            { label: "Total Assessments", value: finalSummary.total },
            {
              label: "Predicted Pass",
              value: finalSummary.pass,
              badgeClass: "bg-emerald-100 text-emerald-700",
            },
            {
              label: "Predicted Fail",
              value: finalSummary.fail,
              badgeClass: "bg-red-100 text-red-700",
            },
            {
              label: "High Risk",
              value: finalSummary.high,
              badgeClass: "bg-red-100 text-red-700",
            },
            {
              label: "Low Risk",
              value: finalSummary.low,
              badgeClass: "bg-emerald-100 text-emerald-700",
            },
          ]}
        >
          <FinalRiskTable risks={finalRisks} />
        </ModelSection>
      </div>
    </div>
  );
}

function PageHeader({ onRefresh }) {
  return (
    <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="typo-eyebrow text-blue-700">
            Progress Monitoring
          </p>
          <h1 className="mt-2 typo-page text-slate-950">
            Student Risk Dashboard
          </h1>
          <p className="mt-2 max-w-3xl typo-body text-slate-600">
            Primary records come from Commerce Risk Assessment (Accounting,
            Business Studies, Economics + attendance). Pass/Fail Outlook is
            secondary; Learning Engagement is an optional comparison only.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="w-fit rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
        >
          Refresh Data
        </button>
      </div>
    </section>
  );
}

function ModelSection({ title, description, summary, children }) {
  return (
    <section className="mb-8">
      <div className="mb-4">
        <h2 className="typo-metric text-slate-950">
          {title}
        </h2>
        <p className="mt-1 typo-body text-slate-600">{description}</p>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {summary.map((item) => (
          <MetricCard key={item.label} {...item} />
        ))}
      </div>

      {children}
    </section>
  );
}

function MetricCard({ label, value, badgeClass }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="typo-eyebrow text-slate-400">
        {label}
      </p>

      {badgeClass ? (
        <span
          className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${badgeClass}`}
        >
          {value}
        </span>
      ) : (
        <p className="typo-metric mt-3 text-slate-950">{value}</p>
      )}
    </div>
  );
}

function XapiRiskTable({ risks }) {
  return (
    <TableShell
      title="Learning Engagement Records"
      emptyMessage="No learning engagement checks found yet."
      isEmpty={risks.length === 0}
    >
      <thead className="bg-slate-100 text-slate-700">
        <tr>
          <TableHead>Student ID</TableHead>
          <TableHead>Performance Class</TableHead>
          <TableHead>Risk Level</TableHead>
          <TableHead>Date</TableHead>
        </tr>
      </thead>

      <tbody>
        {risks.map((risk) => (
          <tr key={risk._id} className="border-t border-slate-200 bg-white">
            <TableCell>{risk.studentId}</TableCell>
            <TableCell strong>{risk.performanceClass}</TableCell>
            <TableCell>
              <RiskBadge riskLevel={risk.riskLevel} />
            </TableCell>
            <TableCell>{formatDate(risk.createdAt)}</TableCell>
          </tr>
        ))}
      </tbody>
    </TableShell>
  );
}

function CommerceRiskTable({ risks }) {
  return (
    <TableShell
      title="Commerce Risk Records"
      emptyMessage="No Commerce risk assessments saved yet."
      isEmpty={risks.length === 0}
    >
      <thead className="bg-slate-100 text-slate-700">
        <tr>
          <TableHead>Student</TableHead>
          <TableHead>Accounting</TableHead>
          <TableHead>Business Studies</TableHead>
          <TableHead>Economics</TableHead>
          <TableHead>Attendance</TableHead>
          <TableHead>Risk Level</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Date</TableHead>
        </tr>
      </thead>

      <tbody>
        {risks.map((risk) => {
          const studentName =
            risk.studentProfile?.user?.fullName ||
            risk.studentId ||
            "--";

          return (
            <tr key={risk._id} className="border-t border-slate-200 bg-white">
              <TableCell strong>{studentName}</TableCell>
              <TableCell>{risk.inputData?.accountingScore ?? "--"}</TableCell>
              <TableCell>
                {risk.inputData?.businessStudiesScore ?? "--"}
              </TableCell>
              <TableCell>{risk.inputData?.economicsScore ?? "--"}</TableCell>
              <TableCell>
                {formatPercentValue(risk.inputData?.attendancePercentage)}
              </TableCell>
              <TableCell>
                <RiskBadge riskLevel={risk.riskLevel} />
              </TableCell>
              <TableCell>{risk.predictionSource || "Automatic"}</TableCell>
              <TableCell>{formatDate(risk.createdAt)}</TableCell>
            </tr>
          );
        })}
      </tbody>
    </TableShell>
  );
}

function FinalRiskTable({ risks }) {
  return (
    <TableShell
      title="Pass/Fail Outlook Records"
      emptyMessage="No Pass/Fail outlook records found yet."
      isEmpty={risks.length === 0}
    >
      <thead className="bg-slate-100 text-slate-700">
        <tr>
          <TableHead>Student ID</TableHead>
          <TableHead>Attendance</TableHead>
          <TableHead>Homework</TableHead>
          <TableHead>Midterm</TableHead>
          <TableHead>Study Hours</TableHead>
          <TableHead>Result</TableHead>
          <TableHead>Risk Level</TableHead>
          <TableHead>Date</TableHead>
        </tr>
      </thead>

      <tbody>
        {risks.map((risk) => (
          <tr key={risk._id} className="border-t border-slate-200 bg-white">
            <TableCell>{risk.studentId}</TableCell>
            <TableCell>{formatPercentValue(risk.inputData?.attendance_pct)}</TableCell>
            <TableCell>{formatPercentValue(risk.inputData?.homework_pct)}</TableCell>
            <TableCell>{risk.inputData?.midterm_score ?? "--"}</TableCell>
            <TableCell>{risk.inputData?.study_hours_per_week ?? "--"}</TableCell>
            <TableCell>
              <ResultBadge result={risk.predictedResult} />
            </TableCell>
            <TableCell>
              <RiskBadge riskLevel={risk.riskLevel} />
            </TableCell>
            <TableCell>{formatDate(risk.createdAt)}</TableCell>
          </tr>
        ))}
      </tbody>
    </TableShell>
  );
}

function TableShell({ title, emptyMessage, isEmpty, children }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h3 className="typo-card text-slate-950">{title}</h3>
      </div>

      {isEmpty ? (
        <div className="p-6 text-center">
          <p className="typo-ui text-slate-600">{emptyMessage}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">{children}</table>
        </div>
      )}
    </div>
  );
}

function TableHead({ children }) {
  return <th className="whitespace-nowrap p-3 font-semibold">{children}</th>;
}

function TableCell({ children, strong = false }) {
  return (
    <td
      className={`whitespace-nowrap p-3 ${
        strong ? "font-semibold text-slate-950" : "text-slate-700"
      }`}
    >
      {children || "--"}
    </td>
  );
}

function RiskBadge({ riskLevel }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${getRiskBadgeClass(
        riskLevel
      )}`}
    >
      {riskLevel || "--"}
    </span>
  );
}

function ResultBadge({ result }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        result === "Pass"
          ? "bg-emerald-100 text-emerald-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {result || "--"}
    </span>
  );
}

function getRiskBadgeClass(riskLevel) {
  if (riskLevel === "High Risk") return "bg-red-100 text-red-700";
  if (riskLevel === "Medium Risk") return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

function formatPercentValue(value) {
  if (value === null || value === undefined) return "--";
  return `${value}%`;
}

function formatDate(dateValue) {
  if (!dateValue) return "--";

  return new Date(dateValue).toLocaleString();
}

export default RiskDashboard;