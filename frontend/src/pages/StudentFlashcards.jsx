import { useEffect, useState } from "react";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function StudentFlashcards() {
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };

  const [subjects, setSubjects] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [form, setForm] = useState({
    subject: "",
    topic: "",
    lessonContent: "",
    count: 5,
  });
  const [flippedId, setFlippedId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadFlashcards = async () => {
    const res = await api.get("/flashcards", { headers });
    setFlashcards(res.data || []);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        // Students cannot list all subjects via /subjects — use their profile subjects.
        const [dashboardRes] = await Promise.all([
          api.get("/student-dashboard", { headers }),
          loadFlashcards(),
        ]);
        setSubjects(dashboardRes.data?.student?.subjects || []);
      } catch (loadError) {
        setError(
          loadError.response?.data?.message || "Failed to load flashcards"
        );
      } finally {
        setLoading(false);
      }
    };

    if (token) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleGenerate = async (event) => {
    event.preventDefault();

    if (!form.subject || !form.topic.trim()) {
      setError("Select a subject and enter a topic (or paste lesson notes).");
      return;
    }

    try {
      setGenerating(true);
      setError("");
      setMessage("");

      const res = await api.post(
        "/flashcards/generate",
        {
          subject: form.subject,
          topic: form.topic.trim(),
          lessonContent: form.lessonContent.trim(),
          count: Number(form.count) || 5,
          save: true,
        },
        { headers }
      );

      setMessage(
        res.data.message ||
          `Generated ${res.data.flashcards?.length || 0} flashcards.`
      );
      setForm((current) => ({
        ...current,
        topic: "",
        lessonContent: "",
      }));
      await loadFlashcards();
    } catch (generateError) {
      setError(
        generateError.response?.data?.message ||
          "Failed to generate flashcards"
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-6">
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="typo-eyebrow text-blue-700">Active Recall</p>
        <h1 className="mt-2 typo-page text-slate-950">Flashcards</h1>
        <p className="mt-2 max-w-3xl typo-body text-slate-600">
          Generate practice cards from a topic or pasted lesson notes, then flip
          cards to test your recall.
        </p>
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

      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <form
          onSubmit={handleGenerate}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="typo-card text-slate-950">Generate Flashcards</h2>
          <p className="mt-1 text-sm text-slate-600">
            Enter a topic. Optionally paste lesson content for better cards.
          </p>

          <div className="mt-4 grid gap-4">
            <label className="typo-label text-slate-700">
              Subject *
              <select
                value={form.subject}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    subject: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
                required
              >
                <option value="">Select subject</option>
                {subjects.map((subject) => (
                  <option key={subject._id} value={subject._id}>
                    {subject.subjectName}
                  </option>
                ))}
              </select>
            </label>

            <label className="typo-label text-slate-700">
              Topic *
              <input
                type="text"
                value={form.topic}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    topic: event.target.value,
                  }))
                }
                placeholder="e.g. Final Accounts"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm"
                required
              />
            </label>

            <label className="typo-label text-slate-700">
              Lesson content (optional)
              <textarea
                value={form.lessonContent}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    lessonContent: event.target.value,
                  }))
                }
                rows={7}
                placeholder="Paste notes or lesson text here..."
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm"
              />
            </label>

            <label className="typo-label text-slate-700">
              Number of cards
              <select
                value={form.count}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    count: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={8}>8</option>
              </select>
            </label>
          </div>

          <button
            type="submit"
            disabled={generating}
            className="mt-5 rounded-lg bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {generating ? "Generating..." : "Generate Flashcards"}
          </button>
        </form>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="typo-card text-slate-950">Practice Deck</h2>
              <p className="mt-1 text-sm text-slate-600">
                Click a card to flip between question and answer.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {flashcards.length} cards
            </span>
          </div>

          {loading ? (
            <p className="text-sm font-semibold text-slate-600">Loading...</p>
          ) : flashcards.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
              No flashcards yet. Generate your first set from a lesson topic.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {flashcards.slice(0, 12).map((card) => {
                const flipped = flippedId === card._id;
                return (
                  <button
                    key={card._id}
                    type="button"
                    onClick={() =>
                      setFlippedId((current) =>
                        current === card._id ? "" : card._id
                      )
                    }
                    className="min-h-36 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
                  >
                    <p className="typo-eyebrow text-slate-400">
                      {card.subject?.subjectName || "Subject"} · {card.topic}
                    </p>
                    <p className="mt-3 text-sm font-semibold text-slate-950">
                      {flipped ? card.answer : card.question}
                    </p>
                    <p className="mt-3 text-xs font-semibold text-blue-700">
                      {flipped ? "Answer" : "Question"} · tap to flip
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default StudentFlashcards;
