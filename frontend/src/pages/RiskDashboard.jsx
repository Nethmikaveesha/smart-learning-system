import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:5001/api";

function RiskDashboard() {
  const [xapiRisks, setXapiRisks] = useState([]);
  const [finalRisks, setFinalRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRiskData = async () => {
    try {
      setLoading(true);
      setError("");

      const [xapiResponse, finalResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/risk`),
        axios.get(`${API_BASE_URL}/risk/final`),
      ]);

      setXapiRisks(xapiResponse.data.data || []);
      setFinalRisks(finalResponse.data.data || []);
    } catch (err) {
      console.error("Failed to fetch risk data:", err);
      setError("Failed to load risk prediction data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskData();
  }, []);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-600">
            Loading risk prediction dashboard...
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
          title="xAPI Performance Classification"
          description="Benchmark model using learning behaviour and engagement data."
          summary={[
            { label: "Total Predictions", value: xapiSummary.total },
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
          title="Final Pass/Fail Risk Prediction"
          description="Project-aligned model using attendance and academic indicators."
          summary={[
            { label: "Total Predictions", value: finalSummary.total },
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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
            ML Monitoring
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-950">
            Student Risk Dashboard
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Monitor stored machine-learning prediction records from the xAPI
            benchmark model and the project pass/fail risk model.
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
        <h2 className="text-3xl font-bold tracking-tight text-slate-950">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
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
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
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
      title="xAPI Prediction Records"
      emptyMessage="No xAPI prediction records found."
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

function FinalRiskTable({ risks }) {
  return (
    <TableShell
      title="Final Risk Prediction Records"
      emptyMessage="No final risk prediction records found."
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
        <h3 className="text-xl font-semibold text-slate-950">{title}</h3>
      </div>

      {isEmpty ? (
        <div className="p-6 text-center">
          <p className="text-sm font-semibold text-slate-600">{emptyMessage}</p>
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