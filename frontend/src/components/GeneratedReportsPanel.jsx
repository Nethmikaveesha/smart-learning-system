import { useCallback, useEffect, useState } from "react";
import api from "../services/api";

function formatGeneratedAt(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("en-GB");
}

function downloadBlob(blob, fileName) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName || "report.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Lists monthly PDFs already written under backend/generated-reports
 * and lets admins download them from the UI.
 */
export default function GeneratedReportsPanel({
  token,
  refreshKey = 0,
  onError,
}) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState("");

  const load = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      onError?.("");

      const res = await api.get("/reports/monthly", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setReports(Array.isArray(res.data) ? res.data : []);
    } catch (loadError) {
      onError?.(
        loadError.response?.data?.message || "Failed to load generated reports"
      );
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [token, onError]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const downloadReport = async (fileName) => {
    try {
      setDownloading(fileName);
      onError?.("");

      const res = await api.get(
        `/reports/monthly/${encodeURIComponent(fileName)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
          skipToast: true,
        }
      );

      downloadBlob(res.data, fileName);
    } catch (downloadError) {
      onError?.(
        downloadError.response?.data?.message ||
          downloadError.message ||
          "Failed to download report"
      );
    } finally {
      setDownloading("");
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm font-medium text-slate-500 shadow-sm">
        Loading generated reports…
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="typo-card text-slate-950">Generated Monthly Reports</h2>
        <p className="mt-1 text-sm text-slate-600">
          Download student progress PDFs created by Generate Monthly Reports.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-5 py-3 font-semibold">Student ID</th>
              <th className="px-5 py-3 font-semibold">Month</th>
              <th className="px-5 py-3 font-semibold">File Name</th>
              <th className="px-5 py-3 font-semibold">Generated</th>
              <th className="px-5 py-3 font-semibold">Size</th>
              <th className="px-5 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reports.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-8 text-center text-slate-500"
                >
                  No reports yet. Click Generate Monthly Reports to create PDFs,
                  then they will appear here.
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report.fileName} className="bg-white hover:bg-slate-50">
                  <td className="px-5 py-3 font-semibold text-slate-900">
                    {report.studentId}
                  </td>
                  <td className="px-5 py-3 text-slate-700">
                    {report.monthLabel}
                  </td>
                  <td className="px-5 py-3 text-slate-700">{report.fileName}</td>
                  <td className="px-5 py-3 text-slate-700">
                    {formatGeneratedAt(report.generatedAt)}
                  </td>
                  <td className="px-5 py-3 text-slate-700">
                    {report.sizeKb} KB
                  </td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => downloadReport(report.fileName)}
                      disabled={downloading === report.fileName}
                      className="rounded-lg bg-sky-700 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {downloading === report.fileName
                        ? "Downloading…"
                        : "Download"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
