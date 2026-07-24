import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function EssayGrader() {
  const { token } = useAuth();

  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState(null);
  const [studentProfileId, setStudentProfileId] = useState("");
  const [error, setError] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  const selectedQuestionData = useMemo(
    () => questions.find((question) => question._id === selectedQuestion),
    [questions, selectedQuestion]
  );

  const wordCount = useMemo(() => {
    return answer.trim() ? answer.trim().split(/\s+/).length : 0;
  }, [answer]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setPageLoading(true);
        setError("");

        const [questionsRes, dashboardRes] = await Promise.all([
          api.get("/essays/questions", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          api.get("/student-dashboard", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        setQuestions(questionsRes.data || []);
        setStudentProfileId(dashboardRes.data.student?._id || "");
      } catch (fetchError) {
        setError(
          fetchError.response?.data?.message ||
            "Failed to load essay grader data"
        );
      } finally {
        setPageLoading(false);
      }
    };

    if (token) fetchData();
  }, [token]);

  const handleSubmit = async () => {
    try {
      if (!selectedQuestion || !answer.trim()) {
        setError("Please select a question and enter your answer.");
        return;
      }

      if (!studentProfileId) {
        setError(
          "Student profile not found. Ask admin to link your student account."
        );
        return;
      }

      setLoading(true);
      setError("");
      setResult(null);

      const res = await api.post(
        "/essays/submit",
        {
          studentId: studentProfileId,
          questionId: selectedQuestion,
          answer,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 30000,
        }
      );

      setResult(res.data.submission);
    } catch (submitError) {
      const apiMessage =
        submitError.response?.data?.message ||
        submitError.message ||
        "Failed to submit essay for grading";

      setError(apiMessage);
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-600">
            Loading essay grader...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
          AI Assessment
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-950">
          Essay Grader
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Submit essay answers and receive AI-assisted evaluation with marks,
          feedback, and NLP analysis.
        </p>
      </section>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 border-b border-slate-100 pb-4">
            <h2 className="text-xl font-semibold text-slate-950">
              Submit Essay Answer
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Select a question and write your answer below.
            </p>
          </div>

          <label className="block text-sm font-bold text-slate-700">
            Essay Question
            <select
              value={selectedQuestion}
              onChange={(event) => {
                setSelectedQuestion(event.target.value);
                setResult(null);
              }}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Select question</option>
              {questions.map((question) => {
                const grade = question.gradeLevel
                  ? `G${question.gradeLevel}`
                  : null;
                const subject = question.subject?.subjectName;
                const prefix = [grade, subject].filter(Boolean).join(" · ");
                const label = prefix
                  ? `${prefix} — ${question.question}`
                  : question.question;

                return (
                  <option key={question._id} value={question._id}>
                    {label}
                  </option>
                );
              })}
            </select>
          </label>

          {selectedQuestionData && (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-900">
                Selected Question
              </p>
              <p className="mt-2 text-sm leading-6 text-blue-800">
                {selectedQuestionData.question}
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-blue-700">
                {selectedQuestionData.gradeLevel
                  ? `Grade ${selectedQuestionData.gradeLevel} · `
                  : ""}
                Max Marks: {selectedQuestionData.maxMarks || "--"}
              </p>
            </div>
          )}

          <label className="mt-5 block text-sm font-bold text-slate-700">
            Your Answer
            <textarea
              value={answer}
              onChange={(event) => {
                setAnswer(event.target.value);
                setResult(null);
              }}
              placeholder="Write your answer here..."
              className="mt-2 min-h-64 w-full resize-y rounded-lg border border-slate-300 px-4 py-3 text-sm leading-6 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-slate-500">
              {wordCount} word{wordCount === 1 ? "" : "s"}
            </p>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !selectedQuestion || !answer.trim()}
              className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {loading ? "Grading..." : "Submit Essay"}
            </button>
          </div>

          {loading && (
            <p className="mt-3 text-sm font-semibold text-blue-700">
              Evaluating keywords and structure. This can take a few seconds...
            </p>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}
        </div>

        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">
            Submission Guide
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <GuideItem title="Answer clearly" text="Use direct points and complete sentences." />
            <GuideItem title="Include key terms" text="Mention important concepts related to the question." />
            <GuideItem title="Structure matters" text="Use an introduction, body, and conclusion where possible." />
          </div>
        </aside>
      </section>

      {result && <EvaluationResult result={result} />}
    </div>
  );
}

function GuideItem({ title, text }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{text}</p>
    </div>
  );
}

function EvaluationResult({ result }) {
  const marks = result.finalMarks ?? result.marks ?? "--";
  const feedback = result.teacherFeedback || result.feedback || "No feedback available.";
  const status = result.status || "Pending";
  const breakdown = result.markBreakdown;

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
            AI-Assisted Essay Grader
          </p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Recommended Score Breakdown
          </h2>
        </div>

        <span className="w-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
          {status}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ResultCard label="Recommended Total" value={marks} />
        <ResultCard
          label="Final Marks"
          value={result.finalMarks ?? "Awaiting teacher"}
        />
        <ResultCard label="Status" value={status} />
      </div>

      {breakdown?.parts?.length > 0 && (
        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Part</th>
                <th className="px-4 py-3">Max</th>
                <th className="px-4 py-3">Recommended</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.parts.map((part) => (
                <tr key={part.key} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{part.label}</p>
                    <p className="mt-1 text-xs text-slate-500">{part.description}</p>
                    {part.key === "keywords" && (
                      <p className="mt-2 text-xs text-slate-600">
                        Matched: {(part.details?.matchedKeywords || []).join(", ") || "None"}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-700">
                    {part.maxMarks}
                  </td>
                  <td className="px-4 py-3 font-semibold text-blue-700">
                    {part.recommendedMarks}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">Feedback</p>
        <p className="mt-2 text-sm leading-7 text-slate-700">{feedback}</p>
      </div>

      {result.nlpEvaluation && <NlpAnalysis analysis={result.nlpEvaluation} />}
    </section>
  );
}

function NlpAnalysis({ analysis }) {
  return (
    <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-xl font-semibold text-slate-950">NLP Analysis</h3>

      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <ResultCard label="NLP Marks" value={analysis.marks ?? "--"} />
        <ResultCard
          label="Semantic Similarity"
          value={formatPercent(analysis.semanticSimilarity)}
        />
        <ResultCard
          label="Keyword Coverage"
          value={formatPercent(analysis.keywordCoverage)}
        />
        <ResultCard
          label="Structure Score"
          value={formatPercent(analysis.structureScore)}
        />
      </div>

      {analysis.structureAnalysis && (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <MiniScore
            label="Introduction"
            value={formatPercent(analysis.structureAnalysis.introduction)}
          />
          <MiniScore
            label="Body"
            value={formatPercent(analysis.structureAnalysis.body)}
          />
          <MiniScore
            label="Conclusion"
            value={formatPercent(analysis.structureAnalysis.conclusion)}
          />
        </div>
      )}
    </div>
  );
}

function ResultCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="typo-metric mt-2 text-slate-950">{value}</p>
    </div>
  );
}

function MiniScore({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }

  return `${Math.round(Number(value) * 100)}%`;
}

export default EssayGrader;