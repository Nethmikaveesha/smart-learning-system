import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";

const COMMERCE_CODES = ["ACC101", "BS101", "ECO101"];

function teacherLabel(teacher) {
  if (!teacher) return "Not assigned";
  if (typeof teacher === "string") return teacher;
  const id = teacher.teacherId || "No ID";
  const name = teacher.fullName || "Teacher";
  return `${id} — ${name}`;
}

function teacherMatchesSubject(teacher, subject) {
  if (!teacher || !subject) return false;

  const subjectId = String(subject._id || "");
  const subjectCode = String(subject.subjectCode || "")
    .trim()
    .toUpperCase();

  // Prefer explicit User.assignedSubject id when the teachers API includes it.
  const assignedSubjectId = String(
    teacher.assignedSubjectId ||
      teacher.assignedSubject?._id ||
      teacher.assignedSubject ||
      ""
  );
  if (subjectId && assignedSubjectId && assignedSubjectId === subjectId) {
    return true;
  }

  const codes = String(teacher.assignedSubjectCode || "")
    .split(",")
    .map((code) => code.trim().toUpperCase())
    .filter((code) => code && code !== "N/A");

  return Boolean(subjectCode && codes.includes(subjectCode));
}

function currentAssigneeId(subject) {
  if (!subject?.assignedTeacher) return "";
  return String(subject.assignedTeacher._id || subject.assignedTeacher);
}

/**
 * Fixed A/L Commerce subjects board — no create form (codes are unique).
 * Admin only assigns / unassigns a teacher and toggles active status.
 */
export default function CommerceSubjectsPanel({
  token,
  refreshKey = 0,
  onSaved,
  onError,
}) {
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [teacherId, setTeacherId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      onError?.("");

      const [subjectsRes, teachersRes] = await Promise.all([
        api.get("/subjects", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        api.get("/users/teachers", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const list = Array.isArray(subjectsRes.data) ? subjectsRes.data : [];
      const ordered = COMMERCE_CODES.map((code) =>
        list.find(
          (item) =>
            String(item.subjectCode || "").toUpperCase() === code
        )
      ).filter(Boolean);

      // Include any unexpected extra subjects after the commerce three.
      const extras = list.filter(
        (item) =>
          !COMMERCE_CODES.includes(
            String(item.subjectCode || "").toUpperCase()
          )
      );

      setSubjects([...ordered, ...extras]);
      setTeachers(Array.isArray(teachersRes.data) ? teachersRes.data : []);
    } catch (loadError) {
      onError?.(
        loadError.response?.data?.message || "Failed to load subjects"
      );
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, [token, onError]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const editingSubject = useMemo(
    () => subjects.find((item) => String(item._id) === String(editingId)),
    [subjects, editingId]
  );

  // Only teachers already linked to this subject (Add Teacher assignment).
  const eligibleTeachers = useMemo(() => {
    if (!editingSubject) return [];

    const matched = teachers.filter((teacher) =>
      teacherMatchesSubject(teacher, editingSubject)
    );

    const currentId = currentAssigneeId(editingSubject);
    if (
      currentId &&
      !matched.some((teacher) => String(teacher._id) === currentId)
    ) {
      const current =
        teachers.find((teacher) => String(teacher._id) === currentId) ||
        (typeof editingSubject.assignedTeacher === "object"
          ? editingSubject.assignedTeacher
          : null);
      if (current) matched.unshift(current);
    }

    return matched;
  }, [editingSubject, teachers]);

  const openAssign = (subject) => {
    setEditingId(subject._id);
    setTeacherId(
      subject.assignedTeacher?._id
        ? String(subject.assignedTeacher._id)
        : subject.assignedTeacher
          ? String(subject.assignedTeacher)
          : ""
    );
    setIsActive(subject.isActive !== false);
  };

  const closeAssign = () => {
    setEditingId(null);
    setTeacherId("");
    setIsActive(true);
  };

  const saveAssign = async (event) => {
    event.preventDefault();
    if (!editingId) return;

    try {
      setSaving(true);
      onError?.("");

      await api.put(
        `/subjects/${editingId}`,
        {
          assignedTeacher: teacherId || null,
          isActive,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      closeAssign();
      onSaved?.();
      await load();
    } catch (saveError) {
      onError?.(
        saveError.response?.data?.message || "Failed to update subject"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm font-medium text-slate-500 shadow-sm">
        Loading commerce subjects…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="typo-card text-slate-950">Commerce Subjects</h2>
          <p className="mt-1 text-sm text-slate-600">
            Core subjects for Grade 12 and 13 Commerce. Choose a subject and
            assign the teacher responsible for it.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-5 py-3 font-semibold">Subject Code</th>
                <th className="px-5 py-3 font-semibold">Subject Name</th>
                <th className="px-5 py-3 font-semibold">Assigned Teacher</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subjects.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-slate-500"
                  >
                    No subjects found. Restart the backend so commerce subjects
                    can be seeded, then refresh.
                  </td>
                </tr>
              ) : (
                subjects.map((subject) => (
                  <tr key={subject._id} className="bg-white hover:bg-slate-50">
                    <td className="px-5 py-3 font-semibold text-slate-900">
                      {subject.subjectCode || "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-800">
                      {subject.subjectName || "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {teacherLabel(subject.assignedTeacher)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          subject.isActive !== false
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {subject.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        onClick={() => openAssign(subject)}
                        className="rounded-lg bg-sky-700 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-sky-800"
                      >
                        Assign
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editingSubject && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 border-b border-slate-100 pb-3">
            <h3 className="typo-card text-slate-950">
              Assign teacher — {editingSubject.subjectCode}{" "}
              {editingSubject.subjectName}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Only teachers linked to {editingSubject.subjectName} are listed
              here. Link a teacher to this subject under Add Teacher if you do
              not see them.
            </p>
          </div>

          <form
            onSubmit={saveAssign}
            className="grid gap-4 md:grid-cols-2"
          >
            <label className="typo-label text-slate-700">
              Assigned Teacher
              <select
                value={teacherId}
                onChange={(event) => setTeacherId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
              >
                <option value="">Not assigned</option>
                {eligibleTeachers.map((teacher) => (
                  <option key={teacher._id} value={teacher._id}>
                    {teacherLabel(teacher)}
                  </option>
                ))}
              </select>
              {eligibleTeachers.length === 0 ? (
                <p className="mt-1 text-sm text-amber-700">
                  No teachers are linked to this subject yet. Open Add Teacher,
                  set their Assigned Subject Code to{" "}
                  {editingSubject.subjectCode}, then return here to assign.
                </p>
              ) : null}
            </label>

            <label className="typo-label text-slate-700">
              Status
              <select
                value={isActive ? "Active" : "Inactive"}
                onChange={(event) =>
                  setIsActive(event.target.value === "Active")
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </label>

            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {saving ? "Saving…" : "Save Assignment"}
              </button>
              <button
                type="button"
                onClick={closeAssign}
                disabled={saving}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
