import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function EssayGrader() {
  const { token } = useAuth();

  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      const res = await api.get("/essays/questions", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setQuestions(res.data);
    };

    fetchQuestions();
  }, [token]);

  const handleSubmit = async () => {
    const studentProfileId =
      "6a30afe57074f4361997befe"; // temporary

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
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">
        Essay Grader
      </h1>

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
        className="bg-blue-600 text-white px-5 py-3 rounded"
      >
        Submit Essay
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
        </div>
      )}
    </div>
  );
}

export default EssayGrader;