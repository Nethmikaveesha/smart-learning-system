import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import TablePagination from "../components/TablePagination";
import useClientTable from "../hooks/useClientTable";

function formatMarks(value) {
  if (value === null || value === undefined || value === "") return "—";
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : "—";
}

function formatRank(value) {
  const numeric = Number(value);
  return numeric > 0 ? numeric : "—";
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

function getStudentName(row) {
  return row?.student?.user?.fullName || row?.student?.studentId || "Student";
}

function getExamName(row) {
  return row?.exam?.examName || "Exam";
}

function getSubjectName(row) {
  return row?.exam?.subject?.subjectName || "";
}

function TeacherZScoresRankings() {
  const { token } = useAuth();

  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        setError("");
        const res = await api.get("/subjects", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const list = Array.isArray(res.data) ? res.data : [];
        setSubjects(list);
        setSubjectId((current) => {
          if (current && list.some((item) => String(item._id) === String(current))) {
            return current;
          }
          return list[0]?._id ? String(list[0]._id) : "";
        });
      } catch (fetchError) {
        setError(
          fetchError.response?.data?.message || "Failed to load assigned subjects"
        );
        setSubjects([]);
        setSubjectId("");
      }
    };

    if (token) loadSubjects();
  }, [token]);

  useEffect(() => {
    const loadResults = async () => {
      if (!subjectId) {
        setResults([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const res = await api.get("/results", {
          headers: { Authorization: `Bearer ${token}` },
          params: { subjectId },
        });
        setResults(Array.isArray(res.data) ? res.data : []);
      } catch (fetchError) {
        setError(
          fetchError.response?.data?.message || "Failed to load rankings"
        );
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    if (token) loadResults();
  }, [token, subjectId]);

  const selectedSubject = useMemo(
    () => subjects.find((item) => String(item._id) === String(subjectId)),
    [subjects, subjectId]
  );

  const tableRows = useMemo(
    () =>
      results.map((row) => ({
        id: row._id,
        student: getStudentName(row),
        exam: getExamName(row),
        subject: getSubjectName(row),
        marks: formatMarks(row.marks),
        grade: row.grade || "—",
        rank: formatRank(row.rank),
        zScore: formatMarks(row.zScore),
        examDate: formatDate(row.exam?.examDate || row.createdAt),
        searchBlob: [
          getStudentName(row),
          getExamName(row),
          getSubjectName(row),
          row.grade,
          row.marks,
          row.rank,
          row.zScore,
        ]
          .filter(Boolean)
          .join(" "),
      })),
    [results]
  );

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

  return (
    <div className="p-6">
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="typo-eyebrow text-blue-700">Teacher Analytics</p>
            <h1 className="mt-2 typo-page text-slate-950">Z-Scores & Rankings</h1>
            <p className="mt-2 max-w-3xl typo-body text-slate-600">
              View exam rankings and Z-scores for each subject assigned to you.
              Select a subject to review its results separately.
            </p>
          </div>

          <label className="typo-label text-slate-700">
            Subject
            <select
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
              disabled={subjects.length === 0}
              className="mt-2 block w-full min-w-56 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm disabled:bg-slate-100"
            >
              {subjects.length === 0 ? (
                <option value="">No assigned subjects</option>
              ) : (
                subjects.map((subject) => (
                  <option key={subject._id} value={String(subject._id)}>
                    {subject.subjectName}
                    {subject.subjectCode ? ` (${subject.subjectCode})` : ""}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>

        {selectedSubject && (
          <p className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-900">
            Subject: {selectedSubject.subjectName}
            {selectedSubject.subjectCode
              ? ` (${selectedSubject.subjectCode})`
              : ""}
          </p>
        )}
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
          {error}
        </div>
      ) : loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          Loading rankings...
        </div>
      ) : subjects.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm font-medium text-amber-900">
          No subjects are assigned to you yet. Ask the admin to assign Accounting,
          Business Studies, or Economics on the Subjects page.
        </div>
      ) : (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search this table..."
              className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm"
            />
            <p className="text-sm text-slate-500">
              {totalItems} match{totalItems === 1 ? "" : "es"}
            </p>
          </div>

          {pageRows.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-600">
              No rankings yet for {selectedSubject?.subjectName || "this subject"}.
              Add marks from Marks Management first.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Exam</th>
                      <th className="px-4 py-3">Marks</th>
                      <th className="px-4 py-3">Grade</th>
                      <th className="px-4 py-3">Rank</th>
                      <th className="px-4 py-3">Z Score</th>
                      <th className="px-4 py-3">Exam Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {pageRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {row.student}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{row.exam}</td>
                        <td className="px-4 py-3 tabular-nums text-slate-800">
                          {row.marks}
                        </td>
                        <td className="px-4 py-3 text-slate-800">{row.grade}</td>
                        <td className="px-4 py-3 tabular-nums text-slate-800">
                          {row.rank}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-800">
                          {row.zScore}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{row.examDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-4 py-3">
                <TablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                />
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

export default TeacherZScoresRankings;
