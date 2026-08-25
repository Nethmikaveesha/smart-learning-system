import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { toastSuccess } from "../utils/toastBridge";

function formatDateTime(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function friendlyBackupLabel(fileName = "") {
  const match = String(fileName).match(
    /(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})/
  );
  if (!match) return fileName || "Backup file";
  const [, year, month, day, hour, minute] = match;
  return `Backup · ${day}/${month}/${year} ${hour}:${minute}`;
}

/**
 * School-admin backup console: create a copy of records, review history,
 * and restore with a clear confirmation. Uses existing /backups APIs only.
 */
export default function DatabaseBackupPanel({
  token,
  refreshKey = 0,
  onSaved,
  onError,
}) {
  const [backups, setBackups] = useState([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoringFile, setRestoringFile] = useState("");

  const load = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      onError?.("");

      const res = await api.get("/backups", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setBackups(Array.isArray(res.data?.backups) ? res.data.backups : []);
      setNote(res.data?.note || "");
    } catch (loadError) {
      onError?.(
        loadError.response?.data?.message || "Failed to load backups"
      );
      setBackups([]);
    } finally {
      setLoading(false);
    }
  }, [token, onError]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const latest = backups[0] || null;

  const summaryCards = useMemo(
    () => [
      {
        label: "Available backups",
        value: String(backups.length),
      },
      {
        label: "Latest backup",
        value: latest ? friendlyBackupLabel(latest.fileName) : "None yet",
      },
      {
        label: "Created on",
        value: latest ? formatDateTime(latest.createdAt) : "—",
      },
    ],
    [backups, latest]
  );

  const createBackup = async () => {
    try {
      setCreating(true);
      onError?.("");

      const res = await api.post(
        "/backups",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toastSuccess(
        res.data?.message || "Backup created successfully."
      );
      onSaved?.();
      await load();
    } catch (createError) {
      onError?.(
        createError.response?.data?.message ||
          createError.message ||
          "Backup failed"
      );
    } finally {
      setCreating(false);
    }
  };

  const restoreBackup = async (fileName) => {
    const label = friendlyBackupLabel(fileName);
    const confirmed = window.confirm(
      `Restore school data from "${label}"?\n\nCurrent records will be replaced with this backup. This cannot be undone from the screen.`
    );
    if (!confirmed) return;

    try {
      setRestoringFile(fileName);
      onError?.("");

      const res = await api.post(
        "/backups/restore",
        { fileName },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toastSuccess(
        res.data?.message || "School data restored from the selected backup."
      );
      onSaved?.();
      await load();
    } catch (restoreError) {
      onError?.(
        restoreError.response?.data?.message ||
          restoreError.message ||
          "Restore failed"
      );
    } finally {
      setRestoringFile("");
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm font-medium text-slate-500 shadow-sm">
        Loading backups…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <h2 className="typo-card text-slate-950">School data backup</h2>
            <p className="mt-1 text-sm text-slate-600">
              Keep a safe copy of users, classes, exams, attendance, and
              settings. Create a backup before major changes, or restore an
              earlier copy if something goes wrong.
            </p>
          </div>
          <button
            type="button"
            onClick={createBackup}
            disabled={creating || Boolean(restoringFile)}
            className="shrink-0 rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {creating ? "Creating backup…" : "Create Backup"}
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {card.label}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900 break-words">
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {note ? (
          <p className="mt-4 text-sm text-slate-600">{note}</p>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="typo-card text-slate-950">Backup history</h3>
          <p className="mt-1 text-sm text-slate-600">
            Newest backups appear first. Restore only when you intend to roll
            the system back to that point in time.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-5 py-3 font-semibold">Backup</th>
                <th className="px-5 py-3 font-semibold">Created</th>
                <th className="px-5 py-3 font-semibold">Size</th>
                <th className="px-5 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {backups.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-8 text-center text-slate-500"
                  >
                    No backups yet. Click Create Backup to save the first copy.
                  </td>
                </tr>
              ) : (
                backups.map((backup) => (
                  <tr
                    key={backup.fileName}
                    className="bg-white hover:bg-slate-50"
                  >
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-900">
                        {friendlyBackupLabel(backup.fileName)}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 break-all">
                        {backup.fileName}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {formatDateTime(backup.createdAt)}
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {backup.sizeKb ?? "?"} KB
                    </td>
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        onClick={() => restoreBackup(backup.fileName)}
                        disabled={
                          creating || restoringFile === backup.fileName
                        }
                        className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {restoringFile === backup.fileName
                          ? "Restoring…"
                          : "Restore"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
