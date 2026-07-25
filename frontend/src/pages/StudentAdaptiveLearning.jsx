import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function StudentAdaptiveLearning() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const loadPlan = async () => {
    const res = await api.get("/adaptive-learning", { headers });
    setData(res.data);
  };

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        setLoading(true);
        setError("");
        await loadPlan();
      } catch (fetchError) {
        setError(
          fetchError.response?.data?.message || "Failed to load study plan"
        );
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError("");
      setMessage("");

      const res = await api.post(
        "/adaptive-learning/generate",
        { limit: 3 },
        { headers }
      );

      setMessage(res.data.message || "Adaptive materials generated.");
      await loadPlan();
    } catch (generateError) {
      setError(
        generateError.response?.data?.message ||
          "Failed to generate adaptive materials"
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-6">
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="typo-eyebrow text-blue-700">Student Learning</p>
            <h1 className="mt-2 typo-page text-slate-950">Study Plan</h1>
            <p className="mt-2 max-w-3xl typo-body text-slate-600">
              Weak subjects are listed from your marks. You can also generate
              personal study notes from incorrect essay answers.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !data?.canGenerate}
            className="rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {generating
              ? "Generating..."
              : "Generate from Incorrect Answers"}
          </button>
        </div>
      </section>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
          {message}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 typo-ui text-slate-600 shadow-sm">
          Loading study plan...
        </div>
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Weak Subjects"
              value={data?.adaptivePlan?.length || 0}
            />
            <MetricCard
              label="Incorrect Attempts"
              value={data?.incorrectAttempts?.length || 0}
            />
            <MetricCard
              label="Generated Materials"
              value={data?.generatedMaterials?.length || 0}
            />
          </section>

          <Panel
            title="Generated from Incorrect Answers"
            description="Personal notes created from weak essay submissions."
          >
            {(data?.generatedMaterials || []).length > 0 ? (
              <div className="space-y-3">
                {data.generatedMaterials.map((item) => (
                  <article
                    key={item._id}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="typo-eyebrow text-slate-400">
                      {item.subject?.subjectName || "Subject"} · {item.topic}
                    </p>
                    <h3 className="mt-2 text-sm font-semibold text-slate-950">
                      {item.noteTitle}
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                      {item.noteDescription}
                    </p>
                    {(item.practiceTips || []).length > 0 ? (
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
                        {item.practiceTips.map((tip) => (
                          <li key={tip}>{tip}</li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <EmptyBlock
                text={
                  data?.canGenerate
                    ? "Click “Generate from Incorrect Answers” to create personal study notes."
                    : "Submit essay answers first. Weak attempts will appear here for generation."
                }
              />
            )}
          </Panel>

          <Panel
            title="Weak Subject Recommendations"
            description="Subjects with marks below 50, plus linked notes and flashcards."
          >
            {(data?.adaptivePlan || []).length > 0 ? (
              <div className="space-y-3">
                {data.adaptivePlan.map((item, index) => (
                  <article
                    key={`${item.subject}-${index}`}
                    className="rounded-lg border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-950">
                        {item.subject || "Subject"}
                      </h3>
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                        Marks: {item.marks}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {item.recommendation}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold">
                      <Link
                        to="/student/study-materials"
                        className="text-blue-700 hover:underline"
                      >
                        Notes ({item.notes?.length || 0})
                      </Link>
                      <Link
                        to="/student/flashcards"
                        className="text-blue-700 hover:underline"
                      >
                        Flashcards ({item.flashcards?.length || 0})
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyBlock
                text={
                  data?.hasExamResults
                    ? "No weak subjects detected. Great job!"
                    : "Recommendations will appear after your first examination."
                }
              />
            )}
          </Panel>

          {(data?.incorrectAttempts || []).length > 0 ? (
            <Panel
              title="Recent Incorrect / Weak Attempts"
              description="Essay answers used as the source for adaptive material generation."
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="p-3 font-semibold">Subject</th>
                      <th className="p-3 font-semibold">Marks</th>
                      <th className="p-3 font-semibold">Weak Topics</th>
                      <th className="p-3 font-semibold">Missing Concepts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.incorrectAttempts.map((item) => (
                      <tr
                        key={item.submissionId}
                        className="border-t border-slate-100 text-slate-700"
                      >
                        <td className="p-3 font-semibold text-slate-900">
                          {item.subject || "--"}
                        </td>
                        <td className="p-3">
                          {item.marks}/{item.maxMarks}
                        </td>
                        <td className="p-3">
                          {(item.weakTopics || []).join(", ") || "--"}
                        </td>
                        <td className="p-3">
                          {(item.missingConcepts || []).join(", ") || "--"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Panel({ title, description, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="typo-card text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="typo-eyebrow text-slate-400">{label}</p>
      <p className="typo-metric mt-2 text-slate-950">{value}</p>
    </div>
  );
}

function EmptyBlock({ text }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
      {text}
    </p>
  );
}

export default StudentAdaptiveLearning;
