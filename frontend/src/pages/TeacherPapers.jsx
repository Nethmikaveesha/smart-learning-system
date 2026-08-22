import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { isAdminRole } from "../utils/adminRoles";
import TablePagination from "../components/TablePagination";
import useClientTable from "../hooks/useClientTable";
import { toastError, toastSuccess } from "../utils/toastBridge";

function truncateText(value, max = 72) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "—";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function TeacherPapers() {
  const { token, user } = useAuth();
  const canSeeDepartment = isAdminRole(user);

  const [scope, setScope] = useState("mine");
  const [papers, setPapers] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [sharePaperId, setSharePaperId] = useState("");
  const [selectedTeacherIds, setSelectedTeacherIds] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const tabs = useMemo(() => {
    const items = [
      { id: "mine", label: "My Papers" },
      { id: "shared", label: "Shared Papers" },
    ];
    if (canSeeDepartment) {
      items.push({ id: "department", label: "All Department Papers" });
    }
    return items;
  }, [canSeeDepartment]);

  const summaryRows = useMemo(
    () =>
      (papers || []).map((paper) => ({
        id: paper._id,
        gradeLevel: paper.gradeLevel ? `Grade ${paper.gradeLevel}` : "—",
        subject:
          paper.subject?.subjectName ||
          paper.subject?.subjectCode ||
          "Subject",
        question: paper.question || "",
        questionShort: truncateText(paper.question, 70),
        maxMarks: paper.maxMarks ?? "—",
        createdBy: paper.createdBy?.fullName || "Unknown",
        createdAt: formatDate(paper.createdAt),
        sharedCount: Array.isArray(paper.sharedWith)
          ? paper.sharedWith.length
          : 0,
        canManage: Boolean(paper.canManage),
        isOwner: Boolean(paper.isOwner),
        searchText: [
          paper.question,
          paper.subject?.subjectName,
          paper.createdBy?.fullName,
          paper.gradeLevel,
        ]
          .filter(Boolean)
          .join(" "),
      })),
    [papers]
  );

  const table = useClientTable(summaryRows, {
    pageSize: 10,
    columns: [
      "gradeLevel",
      "subject",
      "question",
      "createdBy",
      "createdAt",
      "searchText",
    ],
  });

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get("/essays/questions", {
          headers: { Authorization: `Bearer ${token}` },
          params: { scope },
        });
        if (cancelled) return;
        setPapers(Array.isArray(res.data) ? res.data : []);
      } catch (loadError) {
        if (cancelled) return;
        setError(
          loadError.response?.data?.message ||
            loadError.message ||
            "Failed to load papers"
        );
        setPapers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, scope, refreshKey]);

  useEffect(() => {
    if (!token || !sharePaperId) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const res = await api.get("/essays/share-candidates", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        setTeachers(Array.isArray(res.data) ? res.data : []);
      } catch (loadError) {
        if (cancelled) return;
        toastError(
          loadError.response?.data?.message ||
            "Failed to load teachers for sharing"
        );
        setTeachers([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, sharePaperId]);

  const reload = () => setRefreshKey((current) => current + 1);

  const copyPaper = async (paperId) => {
    try {
      setBusyId(paperId);
      await api.post(
        `/essays/questions/${paperId}/copy`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toastSuccess("Paper copied to My Papers");
      if (scope !== "mine") setScope("mine");
      else reload();
    } catch (copyError) {
      toastError(
        copyError.response?.data?.message || "Failed to copy paper"
      );
    } finally {
      setBusyId("");
    }
  };

  const deletePaper = async (paperId) => {
    const confirmed = window.confirm(
      "Delete this paper permanently? Related marking schemes will also be removed."
    );
    if (!confirmed) return;

    try {
      setBusyId(paperId);
      await api.delete(`/essays/questions/${paperId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toastSuccess("Paper deleted");
      reload();
    } catch (deleteError) {
      toastError(
        deleteError.response?.data?.message || "Failed to delete paper"
      );
    } finally {
      setBusyId("");
    }
  };

  const sharePaper = async () => {
    if (!sharePaperId || selectedTeacherIds.length === 0) {
      toastError("Select at least one teacher to share with");
      return;
    }

    try {
      setBusyId(sharePaperId);
      await api.post(
        `/essays/questions/${sharePaperId}/share`,
        { teacherIds: selectedTeacherIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toastSuccess("Paper shared successfully");
      setSharePaperId("");
      setSelectedTeacherIds([]);
      reload();
    } catch (shareError) {
      toastError(
        shareError.response?.data?.message || "Failed to share paper"
      );
    } finally {
      setBusyId("");
    }
  };

  const toggleTeacher = (teacherId) => {
    setSelectedTeacherIds((current) =>
      current.includes(teacherId)
        ? current.filter((id) => id !== teacherId)
        : [...current, teacherId]
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="typo-eyebrow text-blue-700">Teacher Workspace</p>
        <h1 className="mt-2 typo-page text-slate-950">My Papers</h1>
        <p className="mt-2 max-w-3xl typo-body text-slate-600">
          By default you only see papers you created. Shared papers are
          view/copy only — edit and delete stay with the creator or an admin.
        </p>
        <Link
          to="/teacher/create-paper"
          className="mt-4 inline-flex rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Create Paper
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setScope(tab.id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              scope === tab.id
                ? "bg-blue-700 text-white shadow-sm"
                : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            value={table.searchQuery}
            onChange={(event) => table.setSearchQuery(event.target.value)}
            placeholder="Search this table..."
            className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none ring-blue-600/30 transition focus:border-blue-500 focus:ring"
          />
          <p className="text-sm text-slate-500">
            {table.totalItems} match{table.totalItems === 1 ? "" : "es"}
          </p>
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-slate-500">
            Loading papers...
          </p>
        ) : table.totalItems === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            {scope === "shared"
              ? "No papers have been shared with you yet."
              : scope === "department"
                ? "No department papers found."
                : "You have not created any papers yet."}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-3">Grade</th>
                    <th className="px-3 py-3">Subject</th>
                    <th className="px-3 py-3">Question</th>
                    <th className="px-3 py-3">Max</th>
                    <th className="px-3 py-3">Created By</th>
                    <th className="px-3 py-3 whitespace-nowrap">Created</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {table.pageRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-slate-100 align-middle"
                    >
                      <td className="whitespace-nowrap px-3 py-3 text-slate-700">
                        {row.gradeLevel}
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-800">
                        {row.subject}
                      </td>
                      <td
                        className="max-w-md px-3 py-3 text-slate-700"
                        title={row.question}
                      >
                        {row.questionShort}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-slate-700">
                        {row.maxMarks}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {row.createdBy}
                        {scope === "mine" && row.sharedCount > 0 ? (
                          <span className="mt-1 block text-xs text-slate-500">
                            Shared with {row.sharedCount}
                          </span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                        {row.createdAt}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          {(scope === "shared" || !row.isOwner) && (
                            <button
                              type="button"
                              disabled={busyId === row.id}
                              onClick={() => copyPaper(row.id)}
                              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                            >
                              Copy
                            </button>
                          )}
                          {row.canManage && scope !== "shared" && (
                            <button
                              type="button"
                              disabled={busyId === row.id}
                              onClick={() => {
                                setSharePaperId(row.id);
                                setSelectedTeacherIds([]);
                              }}
                              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                            >
                              Share
                            </button>
                          )}
                          {row.canManage && (
                            <button
                              type="button"
                              disabled={busyId === row.id}
                              onClick={() => deletePaper(row.id)}
                              className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <TablePagination
              currentPage={table.currentPage}
              totalPages={table.totalPages}
              totalItems={table.totalItems}
              pageSize={table.pageSize}
              onPageChange={table.setCurrentPage}
            />
          </>
        )}
      </div>

      {sharePaperId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onClick={() => setSharePaperId("")}
          role="presentation"
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h2 className="typo-card text-slate-950">Share Paper</h2>
            <p className="mt-1 text-sm text-slate-600">
              Shared teachers can view and copy this paper. They cannot edit or
              delete the original.
            </p>

            <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
              {teachers.length === 0 ? (
                <p className="text-sm text-slate-500">No other teachers found.</p>
              ) : (
                teachers.map((teacher) => (
                  <label
                    key={teacher._id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTeacherIds.includes(String(teacher._id))}
                      onChange={() => toggleTeacher(String(teacher._id))}
                    />
                    <span>
                      <span className="font-semibold text-slate-900">
                        {teacher.fullName}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {teacher.teacherId || "No ID"} · {teacher.email}
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSharePaperId("")}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === sharePaperId}
                onClick={sharePaper}
                className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Share
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default TeacherPapers;
