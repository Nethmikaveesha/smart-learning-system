import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

/**
 * Teacher review page for AI-Assisted Essay Grader.
 * Shows recommended part marks (keywords + structure) and lets teachers modify them.
 */
function TeacherEssayReview() {
  const { token } = useAuth();

  const [submissions, setSubmissions] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [partMarks, setPartMarks] = useState({});
  const [teacherFeedback, setTeacherFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selected = useMemo(
    () => submissions.find((item) => item._id === selectedId) || null,
    [submissions, selectedId]
  );

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get("/essays/submissions", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const rows = res.data || [];
      setSubmissions(rows);

      if (!selectedId && rows[0]) {
        setSelectedId(rows[0]._id);
      }
    } catch (loadError) {
      setError(
        loadError.response?.data?.message || "Failed to load essay submissions"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!selected) {
      setPartMarks({});
      setTeacherFeedback("");
      return;
    }

    const parts = selected.markBreakdown?.parts || [];
    const nextParts = {};

    parts.forEach((part) => {
      nextParts[part.key] =
        part.teacherMarks !== null && part.teacherMarks !== undefined
          ? part.teacherMarks
          : part.recommendedMarks;
    });

    setPartMarks(nextParts);
    setTeacherFeedback(selected.teacherFeedback || "");
    setMessage("");
  }, [selected]);

  const teacherTotal = useMemo(() => {
    const parts = selected?.markBreakdown?.parts || [];
    if (!parts.length) return null;

    return parts.reduce((sum, part) => {
      const value = Number(partMarks[part.key]);
      return sum + (Number.isNaN(value) ? 0 : value);
    }, 0);
  }, [selected, partMarks]);

  const saveReview = async () => {
    if (!selected) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const markParts = (selected.markBreakdown?.parts || []).map((part) => ({
        key: part.key,
        teacherMarks: Number(partMarks[part.key]),
      }));

      const res = await api.put(
        `/essays/submissions/${selected._id}/approve`,
        {
          markParts,
          finalMarks: teacherTotal,
          teacherFeedback,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setMessage(res.data?.message || "Review saved successfully.");
      await loadSubmissions();
      setSelectedId(selected._id);
    } catch (saveError) {
      setError(
        saveError.response?.data?.message || "Failed to save teacher review"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-sm font-semibold text-slate-600">
        Loading essay submissions...
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
          AI-Assisted Essay Grader
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
          Review & Modify Marks
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          AI recommends scores from keywords and essay structure. Teachers can
          modify each part, then approve the final mark.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
          {message}
        </div>
      )}

      {!submissions.length ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
          No essay submissions yet. Students must submit answers from Essay
          Grader after a paper and marking scheme exist.
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
          <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-black text-slate-900">Submissions</h2>
            <div className="mt-3 space-y-2">
              {submissions.map((item) => {
                const active = item._id === selectedId;
                const name = item.student?.user?.fullName || "Student";
                const question = item.question?.question || "Essay";

                return (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => setSelectedId(item._id)}
                    className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                      active
                        ? "border-blue-300 bg-blue-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <p className="text-sm font-black text-slate-900">{name}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                      {question}
                    </p>
                    <p className="mt-2 text-xs font-bold text-slate-500">
                      AI: {item.marks ?? "--"} · Status: {item.status}
                    </p>
                  </button>
                );
              })}
            </div>
          </aside>

          {selected && (
            <section className="space-y-5">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      {selected.student?.user?.fullName || "Student"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {selected.question?.question}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                    {selected.status}
                  </span>
                </div>

                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Student Answer
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-800">
                    {selected.answer}
                  </p>
                </div>

                {selected.feedback && (
                  <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                      AI Feedback
                    </p>
                    <p className="mt-2 text-sm leading-7 text-blue-900">
                      {selected.feedback}
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-black text-slate-950">
                  Part-wise Marks
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Recommended scores come from keywords and structure. Edit the
                  Teacher Mark column to modify.
                </p>

                {(selected.markBreakdown?.parts || []).length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">
                    This older submission has no part breakdown. Enter a final
                    mark only if needed after re-submit.
                  </p>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Part</th>
                          <th className="px-3 py-2">Max</th>
                          <th className="px-3 py-2">AI Recommended</th>
                          <th className="px-3 py-2">Teacher Mark</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.markBreakdown.parts.map((part) => (
                          <tr
                            key={part.key}
                            className="border-b border-slate-100 align-top"
                          >
                            <td className="px-3 py-3">
                              <p className="font-black text-slate-900">
                                {part.label}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {part.description}
                              </p>
                              {part.key === "keywords" && (
                                <div className="mt-2 space-y-1 text-xs text-slate-600">
                                  <p>
                                    Matched:{" "}
                                    {(part.details?.matchedKeywords || []).join(
                                      ", "
                                    ) || "None"}
                                  </p>
                                  <p>
                                    Missing:{" "}
                                    {(part.details?.missingKeywords || []).join(
                                      ", "
                                    ) || "None"}
                                  </p>
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3 font-semibold text-slate-700">
                              {part.maxMarks}
                            </td>
                            <td className="px-3 py-3 font-semibold text-blue-700">
                              {part.recommendedMarks}
                            </td>
                            <td className="px-3 py-3">
                              <input
                                type="number"
                                min="0"
                                max={part.maxMarks}
                                step="0.5"
                                value={partMarks[part.key] ?? ""}
                                onChange={(event) =>
                                  setPartMarks((current) => ({
                                    ...current,
                                    [part.key]: event.target.value,
                                  }))
                                }
                                className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <ScoreCard
                    label="AI Recommended Total"
                    value={selected.markBreakdown?.recommendedTotal ?? selected.marks}
                  />
                  <ScoreCard label="Teacher Total" value={teacherTotal ?? "--"} />
                  <ScoreCard
                    label="Paper Max"
                    value={
                      selected.markBreakdown?.maxMarks ||
                      selected.question?.maxMarks ||
                      "--"
                    }
                  />
                </div>

                <label className="mt-5 block text-sm font-bold text-slate-700">
                  Teacher Feedback
                  <textarea
                    value={teacherFeedback}
                    onChange={(event) => setTeacherFeedback(event.target.value)}
                    placeholder="Optional comments for the student..."
                    className="mt-2 min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm"
                  />
                </label>

                <button
                  type="button"
                  onClick={saveReview}
                  disabled={saving || !(selected.markBreakdown?.parts || []).length}
                  className="mt-5 rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {saving ? "Saving..." : "Save Teacher Review"}
                </button>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

export default TeacherEssayReview;
