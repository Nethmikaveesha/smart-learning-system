import { useMemo, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const quickPrompts = [
  "Help me plan revision for my next exam.",
  "How can I improve my weak subject?",
  "Explain how attendance can affect performance.",
  "Give me study tips for Commerce subjects.",
];

function Chatbot() {
  const { token, user } = useAuth();

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi, I am your EduTrack learning assistant. Ask me about study planning, subjects, marks, attendance, or exam preparation.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const displayName = useMemo(
    () => user?.fullName || user?.email || "Student",
    [user]
  );

  const askQuestion = async (customQuestion) => {
    const finalQuestion = (customQuestion || question).trim();

    if (!finalQuestion) return;

    const userMessage = {
      role: "user",
      content: finalQuestion,
    };

    try {
      setLoading(true);
      setError("");
      setQuestion("");
      setMessages((current) => [...current, userMessage]);

      const res = await api.post(
        "/chatbot/ask",
        { question: finalQuestion },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: res.data.answer || "I could not generate an answer.",
        },
      ]);
    } catch (askError) {
      setError(
        askError.response?.data?.message || "Failed to get chatbot response"
      );

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "Sorry, I could not respond right now. Please try again in a moment.",
        },
      ]);
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
    <div className="p-6">
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
          AI Assistant
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-950">
          Learning Chatbot
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Ask study questions, request revision guidance, or get help
          understanding academic progress.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="flex min-h-[620px] flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  EduTrack Assistant
                </p>
                <p className="text-xs font-semibold text-slate-500">
                  Signed in as {displayName}
                </p>
              </div>

              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                Online
              </span>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4">
            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm">
                  Thinking...
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <div className="border-t border-slate-200 p-4">
            <div className="flex gap-3">
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your question..."
                rows={2}
                className="min-h-12 flex-1 resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />

              <button
                type="button"
                onClick={() => askQuestion()}
                disabled={loading || !question.trim()}
                className="self-end rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {loading ? "Sending" : "Send"}
              </button>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Press Enter to send. Use Shift + Enter for a new line.
            </p>
          </div>
        </div>

        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Quick Prompts</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Start with a suggested question.
          </p>

          <div className="mt-4 space-y-3">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => askQuestion(prompt)}
                disabled={loading}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-bold leading-6 text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {prompt}
              </button>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}

function ChatMessage({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
          isUser
            ? "rounded-br-sm bg-blue-700 font-semibold text-white"
            : "rounded-bl-sm border border-slate-200 bg-white text-slate-700"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

export default Chatbot;