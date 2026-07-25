import { useEffect, useState } from "react";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const EMPTY_FORM = {
  subject: "",
  topic: "",
  difficultyLevel: "Medium",
  noteTitle: "",
  noteDescription: "",
  videoLink: "",
};

function TeacherContentProvider() {
  const { token } = useAuth();

  const [subjects, setSubjects] = useState([]);
  const [contents, setContents] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedBy, setGeneratedBy] = useState("");

  const headers = { Authorization: `Bearer ${token}` };

  const loadContents = async () => {
    const res = await api.get("/content-recommendations", { headers });
    setContents(res.data || []);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setError("");
        const [subjectsRes] = await Promise.all([
          api.get("/subjects", { headers }),
          loadContents(),
        ]);
        setSubjects(subjectsRes.data || []);
      } catch (loadError) {
        setError(
          loadError.response?.data?.message || "Failed to load content provider"
        );
      }
    };

    if (token) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleGenerate = async () => {
    if (!form.subject || !form.topic.trim()) {
      setError("Select a subject and enter a topic before generating.");
      return;
    }

    try {
      setGenerating(true);
      setError("");
      setMessage("");

      const res = await api.post(
        "/content-recommendations/generate",
        {
          subject: form.subject,
          topic: form.topic.trim(),
          difficultyLevel: form.difficultyLevel,
          save: false,
        },
        { headers }
      );

      const generated = res.data.generated || {};
      setForm((current) => ({
        ...current,
        noteTitle: generated.noteTitle || "",
        noteDescription: generated.noteDescription || "",
        videoLink: generated.videoLink || "",
        difficultyLevel: generated.difficultyLevel || current.difficultyLevel,
      }));
      setGeneratedBy(generated.generatedBy || "gemini");
      setMessage("Study notes generated. Review them, then save for students.");
    } catch (generateError) {
      setError(
        generateError.response?.data?.message ||
          "Failed to generate study content"
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (
      !form.subject ||
      !form.topic.trim() ||
      !form.noteTitle.trim() ||
      !form.noteDescription.trim()
    ) {
      setError("Subject, topic, note title, and note description are required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      await api.post(
        "/content-recommendations",
        {
          subject: form.subject,
          topic: form.topic.trim(),
          noteTitle: form.noteTitle.trim(),
          noteDescription: form.noteDescription.trim(),
          videoLink: form.videoLink.trim(),
          difficultyLevel: form.difficultyLevel,
        },
        { headers }
      );

      setMessage("Content saved. Students can now see it in Study Materials.");
      setForm((current) => ({
        ...EMPTY_FORM,
        subject: current.subject,
        difficultyLevel: current.difficultyLevel,
      }));
      setGeneratedBy("");
      await loadContents();
    } catch (saveError) {
      setError(
        saveError.response?.data?.message || "Failed to save study content"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="typo-eyebrow text-blue-700">Teacher Tools</p>
        <h1 className="mt-2 typo-page text-slate-950">Content Provider</h1>
        <p className="mt-2 max-w-3xl typo-body text-slate-600">
          Generate study notes for a topic, review the draft, then save it so
          students receive helpful revision material and video links.
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

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <form
          onSubmit={handleSave}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="typo-card text-slate-950">Create Study Content</h2>
              <p className="mt-1 text-sm text-slate-600">
                Generate a draft first, edit if needed, then save.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {generating ? "Generating..." : "Generate Notes"}
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="typo-label text-slate-700">
              Subject *
              <select
                value={form.subject}
                onChange={(event) => updateField("subject", event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
                required
              >
                <option value="">Select subject</option>
                {subjects.map((subject) => (
                  <option key={subject._id} value={subject._id}>
                    {subject.subjectName}
                    {subject.subjectCode ? ` (${subject.subjectCode})` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="typo-label text-slate-700">
              Difficulty
              <select
                value={form.difficultyLevel}
                onChange={(event) =>
                  updateField("difficultyLevel", event.target.value)
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </label>

            <label className="typo-label text-slate-700 md:col-span-2">
              Topic *
              <input
                type="text"
                value={form.topic}
                onChange={(event) => updateField("topic", event.target.value)}
                placeholder="e.g. Partnership Accounts"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm"
                required
              />
            </label>

            <label className="typo-label text-slate-700 md:col-span-2">
              Note Title *
              <input
                type="text"
                value={form.noteTitle}
                onChange={(event) =>
                  updateField("noteTitle", event.target.value)
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm"
                required
              />
            </label>

            <label className="typo-label text-slate-700 md:col-span-2">
              Note Description *
              <textarea
                value={form.noteDescription}
                onChange={(event) =>
                  updateField("noteDescription", event.target.value)
                }
                rows={8}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm"
                required
              />
            </label>

            <label className="typo-label text-slate-700 md:col-span-2">
              Video Link
              <input
                type="url"
                value={form.videoLink}
                onChange={(event) =>
                  updateField("videoLink", event.target.value)
                }
                placeholder="YouTube search or video URL"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm"
              />
              {generatedBy ? (
                <span className="mt-1 block typo-caption text-slate-500">
                  Draft source: {generatedBy === "gemini" ? "Gemini" : "Fallback notes"}
                </span>
              ) : null}
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {saving ? "Saving..." : "Save for Students"}
            </button>

            {form.videoLink ? (
              <a
                href={form.videoLink}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-blue-200 bg-blue-50 px-5 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                Open Video Search
              </a>
            ) : null}
          </div>
        </form>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="typo-card text-slate-950">Saved Content</h2>
          <p className="mt-1 text-sm text-slate-600">
            Latest notes available to students in Study Materials.
          </p>

          <div className="mt-4 space-y-3">
            {contents.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                No content saved yet. Generate and save your first topic notes.
              </p>
            ) : (
              contents.slice(0, 8).map((item) => (
                <article
                  key={item._id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="typo-eyebrow text-slate-400">
                    {item.subject?.subjectName || "Subject"} · {item.difficultyLevel}
                  </p>
                  <h3 className="mt-2 text-sm font-semibold text-slate-950">
                    {item.noteTitle}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">Topic: {item.topic}</p>
                  {item.videoLink ? (
                    <a
                      href={item.videoLink}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-sm font-semibold text-blue-700 hover:underline"
                    >
                      Video link
                    </a>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default TeacherContentProvider;
