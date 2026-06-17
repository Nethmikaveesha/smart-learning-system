import { useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function Chatbot() {
  const { token } = useAuth();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const askQuestion = async () => {
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
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <h1 className="text-3xl font-bold mb-6">AI Learning Assistant</h1>

      <div className="bg-white p-6 rounded-xl shadow">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question..."
          className="w-full border p-3 rounded mb-4"
          rows="4"
        />

        <button
          onClick={askQuestion}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Ask
        </button>

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