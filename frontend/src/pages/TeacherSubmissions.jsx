import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import TablePagination from "../components/TablePagination";
import useClientTable from "../hooks/useClientTable";
import MarkdownAnswer from "../components/MarkdownAnswer";

function truncateText(value, max = 72) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "—";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
}

function formatSubmittedAt(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStudentName(submission) {
  return (
    submission?.student?.user?.fullName ||
    submission?.student?.studentId ||
    "Student"
  );
}

function getQuestionText(submission) {
  return submission?.question?.question || "Untitled essay";
}

function getMaxMarks(submission) {
  return (
    Number(
      submission?.markBreakdown?.maxMarks ||
        submission?.question?.maxMarks ||
        100
    ) || 100
  );
}

function getDisplayMarks(submission) {
  const marks = Number(
    submission?.finalMarks ?? submission?.marks ?? 0
  );
  const max = getMaxMarks(submission);
  const safeMarks = Number.isFinite(marks) ? marks : 0;
  return {
    marks: safeMarks,
    max,
    label: `${Math.round(safeMarks * 100) / 100}/${max}`,
  };
}

function getStatusMeta(status) {
  const normalized = String(status || "Pending");
  if (normalized === "Approved") {
    return {
      label: "Approved",
      className: "bg-emerald-100 text-emerald-800",
    };
  }
  if (normalized === "Modified") {
    return {
      label: "Teacher Modified",
      className: "bg-amber-100 text-amber-900",
    };
  }
  return {
    label: "AI Evaluated",
    className: "bg-sky-100 text-sky-800",
  };
}

function formatPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  const ratio = numeric <= 1 ? numeric * 100 : numeric;
  return `${Math.round(ratio)}%`;
}

function ProgressBar({ label, value, max = 100 }) {
  const numericValue = Number(value) || 0;
  const numericMax = Number(max) || 100;
  const percent = Math.max(
    0,
    Math.min(100, numericMax > 0 ? (numericValue / numericMax) * 100 : 0)
  );

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="tabular-nums text-slate-600">
          {numericValue}/{numericMax}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-sky-600 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function ChipList({ items, emptyLabel = "None listed" }) {
  const values = (items || []).filter(Boolean);
  if (!values.length) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {values.map((item) => (
        <span
          key={item}
          className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function DetailSection({ title, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="typo-card text-slate-950">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SubmissionDetailsModal({ submission, onClose }) {
  if (!submission) return null;

  const marks = getDisplayMarks(submission);
  const status = getStatusMeta(submission.status);
  const breakdownParts = submission.markBreakdown?.parts || [];
  const topic = submission.topicAnalysis || {};
  const nlp = submission.nlpEvaluation || {};

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="my-4 w-full max-w-5xl rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="submission-details-title"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 rounded-t-2xl">
          <div>
            <p className="typo-eyebrow text-blue-700">Submission Details</p>
            <h2
              id="submission-details-title"
              className="mt-1 typo-card text-slate-950"
            >
              {getStudentName(submission)}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Submitted {formatSubmittedAt(submission.createdAt)} · Marks{" "}
              {marks.label}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
            >
              {status.label}
            </span>
            <Link
              to={`/teacher/essay-review?submission=${submission._id}`}
              className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              Open in Essay Review
            </Link>
          </div>

          <DetailSection title="Question">
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-800">
              {getQuestionText(submission)}
            </p>
          </DetailSection>

          <DetailSection title="Student Answer">
            <MarkdownAnswer answer={submission.answer} />
          </DetailSection>

          <DetailSection title="Marks Summary">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Total Mark
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-slate-950">
                  {marks.label}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  AI Suggested
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-slate-950">
                  {submission.markBreakdown?.recommendedTotal ??
                    submission.marks ??
                    "—"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Final / Teacher
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-slate-950">
                  {submission.finalMarks ??
                    submission.markBreakdown?.teacherTotal ??
                    "Awaiting review"}
                </p>
              </div>
            </div>
          </DetailSection>

          <DetailSection title="Mark Breakdown">
            {breakdownParts.length === 0 ? (
              <p className="text-sm text-slate-500">
                No part-wise breakdown available for this submission.
              </p>
            ) : (
              <div className="space-y-4">
                {breakdownParts.map((part) => (
                  <div key={part.key}>
                    <ProgressBar
                      label={part.label}
                      value={
                        part.teacherMarks ??
                        part.recommendedMarks ??
                        0
                      }
                      max={part.maxMarks || 0}
                    />
                    {part.description ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {part.description}
                      </p>
                    ) : null}
                    {part.key === "keywords" ? (
                      <div className="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                        <p>
                          Matched:{" "}
                          {(part.details?.matchedKeywords || []).join(", ") ||
                            "None"}
                        </p>
                        <p>
                          Missing:{" "}
                          {(part.details?.missingKeywords || []).join(", ") ||
                            "None"}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </DetailSection>

          <div className="grid gap-4 lg:grid-cols-2">
            <DetailSection title="Strong Areas">
              <ChipList
                items={topic.strongAreas}
                emptyLabel="No strong areas recorded."
              />
            </DetailSection>
            <DetailSection title="Weak Topics">
              <ChipList
                items={topic.weakTopics}
                emptyLabel="No weak topics recorded."
              />
            </DetailSection>
            <DetailSection title="Missing Concepts">
              <ChipList
                items={topic.missingConcepts}
                emptyLabel="No missing concepts recorded."
              />
            </DetailSection>
            <DetailSection title="Improvement Suggestions">
              {(topic.improvementSuggestions || []).length ? (
                <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
                  {topic.improvementSuggestions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">
                  No improvement suggestions recorded.
                </p>
              )}
            </DetailSection>
          </div>

          <DetailSection title="AI Evaluation">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Suggested Marks
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-950">
                  {nlp.marks ?? "—"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Semantic Similarity
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-950">
                  {formatPercent(nlp.semanticSimilarity)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Keyword Coverage
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-950">
                  {formatPercent(nlp.keywordCoverage)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Structure Score
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-950">
                  {formatPercent(nlp.structureScore)}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-700">
              {nlp.feedback ||
                nlp.structureAnalysis?.feedback ||
                submission.feedback ||
                "No AI feedback available."}
            </p>
          </DetailSection>

          {(submission.teacherFeedback || submission.feedback) && (
            <DetailSection title="Teacher / System Feedback">
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {submission.teacherFeedback || submission.feedback}
              </p>
            </DetailSection>
          )}
        </div>
      </div>
    </div>
  );
}

function TeacherSubmissions() {
  const { token } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const summaryRows = useMemo(
    () =>
      (submissions || []).map((item) => {
        const marks = getDisplayMarks(item);
        const status = getStatusMeta(item.status);
        return {
          id: item._id,
          student: getStudentName(item),
          question: getQuestionText(item),
          questionShort: truncateText(getQuestionText(item), 64),
          submittedAt: formatSubmittedAt(item.createdAt),
          marksLabel: marks.label,
          statusLabel: status.label,
          statusClassName: status.className,
          searchText: [
            getStudentName(item),
            getQuestionText(item),
            status.label,
            marks.label,
          ].join(" "),
        };
      }),
    [submissions]
  );

  const table = useClientTable(summaryRows, {
    pageSize: 10,
    columns: ["student", "question", "submittedAt", "marksLabel", "statusLabel", "searchText"],
  });

  const selectedSubmission = useMemo(
    () => submissions.find((item) => item._id === selectedId) || null,
    [selectedId, submissions]
  );

  useEffect(() => {
    if (!token) return undefined;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get("/essays/submissions", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        setSubmissions(Array.isArray(res.data) ? res.data : []);
      } catch (loadError) {
        if (cancelled) return;
        setError(
          loadError.response?.data?.message ||
            loadError.message ||
            "Failed to load student submissions"
        );
        setSubmissions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!selectedSubmission) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") setSelectedId("");
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedSubmission]);

  return (
    <div className="p-6">
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="typo-eyebrow text-blue-700">Teacher Workspace</p>
        <h1 className="mt-2 typo-page text-slate-950">Student Submissions</h1>
        <p className="mt-2 max-w-3xl typo-body text-slate-600">
          Review essay submissions at a glance. Open any row for the full
          question, answer, mark breakdown, and AI evaluation.
        </p>
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
            Loading submissions...
          </p>
        ) : table.totalItems === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            No essay submissions yet.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-3">Student</th>
                    <th className="px-3 py-3">Question</th>
                    <th className="px-3 py-3 whitespace-nowrap">Submitted At</th>
                    <th className="px-3 py-3 text-right">Marks</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {table.pageRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-slate-100 align-middle"
                    >
                      <td className="px-3 py-3 font-semibold text-slate-900">
                        {row.student}
                      </td>
                      <td
                        className="max-w-md px-3 py-3 text-slate-700"
                        title={row.question}
                      >
                        {row.questionShort}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                        {row.submittedAt}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-900">
                        {row.marksLabel}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${row.statusClassName}`}
                        >
                          {row.statusLabel}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedId(row.id)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
                        >
                          View Details
                        </button>
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

      {selectedSubmission ? (
        <SubmissionDetailsModal
          submission={selectedSubmission}
          onClose={() => setSelectedId("")}
        />
      ) : null}
    </div>
  );
}

export default TeacherSubmissions;
