import { useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function Chatbot() {
  const { token } = useAuth();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const askQuestion = async () => {
    if (!question.trim()) return;

    try {
      setLoading(true);
      setError("");
      setAnswer("");

      const res = await api.post(
        "/chatbot/ask",
        { question },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setAnswer(res.data.answer);
    } catch (askError) {
      setError(
        askError.response?.data?.message || "Failed to get chatbot response"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      askQuestion();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <h1 className="text-3xl font-bold mb-6">AI Learning Assistant</h1>

      <div className="bg-white p-6 rounded-xl shadow">
        <p className="mb-4 text-sm text-slate-600">
          Ask questions about your subjects, study planning, attendance, marks,
          and exam preparation.
        </p>

        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
          <input
            type="text"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your question..."
            className="flex-1 rounded-lg border px-4 py-2"
          />

          <button
            type="button"
            onClick={askQuestion}
            disabled={loading || !question.trim()}
            className="rounded-lg bg-blue-600 px-6 py-2 text-white disabled:bg-blue-300"
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {answer && (
          <div className="mt-6 p-4 bg-slate-100 rounded">
            <h2 className="font-bold mb-2">Answer</h2>
            <p>{answer}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Chatbot;
