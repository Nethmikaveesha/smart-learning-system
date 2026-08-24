import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import TablePagination from "../components/TablePagination";
import useClientTable from "../hooks/useClientTable";

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
}

function formatRole(role) {
  if (!role) return "";
  if (role === "superadmin") return "Super Admin";
  return String(role).charAt(0).toUpperCase() + String(role).slice(1);
}

function getActionBadgeClass(action) {
  const normalized = String(action || "").toUpperCase();

  if (normalized === "CREATE" || normalized === "ENABLE" || normalized === "RESTORE") {
    return "bg-emerald-100 text-emerald-800 ring-emerald-200";
  }
  if (normalized === "UPDATE" || normalized === "BACKUP" || normalized === "PREDICT") {
    return "bg-blue-100 text-blue-800 ring-blue-200";
  }
  if (
    normalized === "DELETE" ||
    normalized === "DISABLE" ||
    normalized === "REJECT"
  ) {
    return "bg-red-100 text-red-800 ring-red-200";
  }
  if (normalized === "LOGIN" || normalized === "LOGOUT") {
    return "bg-slate-100 text-slate-700 ring-slate-200";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function AdminAuditLogs() {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    const loadLogs = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get("/audit-logs", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLogs(Array.isArray(res.data) ? res.data : []);
      } catch (fetchError) {
        setError(
          fetchError.response?.data?.message || "Failed to load audit logs"
        );
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    if (token) loadLogs();
  }, [token]);

  const actionOptions = useMemo(() => {
    const values = new Set(
      logs.map((log) => String(log.action || "").toUpperCase()).filter(Boolean)
    );
    return [...values].sort();
  }, [logs]);

  const moduleOptions = useMemo(() => {
    const values = new Set(
      logs.map((log) => String(log.module || "").trim()).filter(Boolean)
    );
    return [...values].sort((left, right) => left.localeCompare(right));
  }, [logs]);

  const tableRows = useMemo(() => {
    return logs
      .filter((log) => {
        if (
          actionFilter &&
          String(log.action || "").toUpperCase() !== actionFilter
        ) {
          return false;
        }
        if (moduleFilter && String(log.module || "") !== moduleFilter) {
          return false;
        }
        if (dateFilter && toDateInputValue(log.createdAt) !== dateFilter) {
          return false;
        }
        return true;
      })
      .map((log) => {
        const performerName = log.user?.fullName || "System";
        const roleLabel = formatRole(log.user?.role);
        const action = String(log.action || "UNKNOWN").toUpperCase();

        return {
          id: log._id,
          createdAtLabel: formatDateTime(log.createdAt),
          performedBy: performerName,
          roleLabel: roleLabel || "—",
          performedByDisplay: roleLabel
            ? `${performerName} (${roleLabel})`
            : performerName,
          action,
          module: log.module || "—",
          description: log.description || "—",
          searchBlob: [
            formatDateTime(log.createdAt),
            performerName,
            roleLabel,
            action,
            log.module,
            log.description,
            log.user?.email,
          ]
            .filter(Boolean)
            .join(" "),
        };
      });
  }, [actionFilter, dateFilter, logs, moduleFilter]);

  const {
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    pageRows,
    totalItems,
    totalPages,
    pageSize,
  } = useClientTable(tableRows, {
    columns: ["searchBlob"],
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [actionFilter, moduleFilter, dateFilter, setCurrentPage]);

  return (
    <div className="p-6">
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="typo-eyebrow text-blue-700">System</p>
        <h1 className="mt-2 typo-page text-slate-950">Audit Logs</h1>
        <p className="mt-2 max-w-3xl typo-body text-slate-600">
          Track who created, updated, or deleted records across the school
          system. Filter by action, module, or date to investigate activity.
        </p>
      </section>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-3 border-b border-slate-100 px-4 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <label className="block min-w-0 flex-1">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Search
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search action, module, user, or description..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none ring-blue-200 focus:ring"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Action
                </span>
                <select
                  value={actionFilter}
                  onChange={(event) => setActionFilter(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-blue-200 focus:ring"
                >
                  <option value="">All actions</option>
                  {actionOptions.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Module
                </span>
                <select
                  value={moduleFilter}
                  onChange={(event) => setModuleFilter(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-blue-200 focus:ring"
                >
                  <option value="">All modules</option>
                  {moduleOptions.map((moduleName) => (
                    <option key={moduleName} value={moduleName}>
                      {moduleName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Date
                </span>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-blue-200 focus:ring"
                />
              </label>
            </div>
          </div>

          {(actionFilter || moduleFilter || dateFilter || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setActionFilter("");
                setModuleFilter("");
                setDateFilter("");
                setSearchQuery("");
              }}
              className="text-xs font-semibold text-blue-700 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <p className="p-6 text-sm font-semibold text-slate-600">
            Loading audit logs...
          </p>
        ) : totalItems === 0 ? (
          <p className="p-6 text-sm font-semibold text-slate-600">
            No audit logs match the current filters.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Created At</th>
                    <th className="px-4 py-3 font-semibold">Performed By</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                    <th className="px-4 py-3 font-semibold">Module</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {pageRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-700">
                        {row.createdAtLabel}
                      </td>
                      <td className="px-4 py-3 text-slate-800">
                        <p className="font-medium text-slate-900">
                          {row.performedBy}
                        </p>
                        <p className="text-xs text-slate-500">{row.roleLabel}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ring-1 ring-inset ${getActionBadgeClass(
                            row.action
                          )}`}
                        >
                          {row.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {row.module}
                      </td>
                      <td className="max-w-xl px-4 py-3 text-slate-700">
                        {row.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </section>
    </div>
  );
}

export default AdminAuditLogs;
