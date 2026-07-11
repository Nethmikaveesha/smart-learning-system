import { useEffect, useState } from "react";
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
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

        setQuestions(questionsRes.data);
        setStudentProfileId(dashboardRes.data.student?._id || "");
      } catch (fetchError) {
        setError(
          fetchError.response?.data?.message ||
            "Failed to load essay grader data"
        );
      }
    };

    if (token) {
      fetchData();
    }
  }, [token]);

  const handleSubmit = async () => {
    try {
      if (!selectedQuestion || !answer.trim()) {
        setError("Please select a question and enter your answer.");
        return;
      }

      if (!studentProfileId) {
        setError("Student profile not found.");
        return;
      }

      setLoading(true);
      setError("");

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
        }
      );

      setResult(res.data.submission);
    } catch (submitError) {
      setError(
        submitError.response?.data?.message ||
          "Failed to submit essay for grading"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">
        Essay Grader
      </h1>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
          {error}
        </div>
      )}

      <select
        className="border p-3 rounded w-full mb-4"
        onChange={(e) =>
          setSelectedQuestion(e.target.value)
        }
      >
        <option>Select Question</option>

        {questions.map((q) => (
          <option key={q._id} value={q._id}>
            {q.question}
          </option>
        ))}
      </select>

      <textarea
        className="border p-3 rounded w-full h-40 mb-4"
        placeholder="Write your answer..."
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
      />

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-blue-600 text-white px-5 py-3 rounded disabled:bg-blue-300"
      >
        {loading ? "Grading..." : "Submit Essay"}
      </button>

      {result && (
        <div className="bg-white shadow rounded p-5 mt-6">
          <h2 className="text-xl font-bold mb-3">
            Evaluation Result
          </h2>

          <p>
            <strong>Marks:</strong>{" "}
            {result.finalMarks || result.marks}
          </p>

          <p>
            <strong>Feedback:</strong>{" "}
            {result.teacherFeedback ||
              result.feedback}
          </p>

          <p>
            <strong>Status:</strong>{" "}
            {result.status || "Pending"}
          </p>

          {result.nlpEvaluation && (
            <div className="mt-4 border-t pt-4">
              <h3 className="font-semibold mb-2">
                NLP Analysis
              </h3>

              <p>
                <strong>NLP Marks:</strong>{" "}
                {result.nlpEvaluation.marks}
              </p>

              <p>
                <strong>Semantic Similarity:</strong>{" "}
                {Math.round(
                  result.nlpEvaluation.semanticSimilarity * 100
                )}
                %
              </p>

              <p>
                <strong>Keyword Coverage:</strong>{" "}
                {Math.round(
                  result.nlpEvaluation.keywordCoverage * 100
                )}
                %
              </p>

              <p>
                <strong>Structure Score:</strong>{" "}
                {Math.round(
                  result.nlpEvaluation.structureScore * 100
                )}
                %
              </p>

              {result.nlpEvaluation.structureAnalysis && (
                <div className="mt-2 text-sm text-gray-700">
                  <p>
                    Introduction:{" "}
                    {Math.round(
                      result.nlpEvaluation.structureAnalysis
                        .introduction * 100
                    )}
                    %
                  </p>
                  <p>
                    Body:{" "}
                    {Math.round(
                      result.nlpEvaluation.structureAnalysis.body *
                        100
                    )}
                    %
                  </p>
                  <p>
                    Conclusion:{" "}
                    {Math.round(
                      result.nlpEvaluation.structureAnalysis
                        .conclusion * 100
                    )}
                    %
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default EssayGrader;
