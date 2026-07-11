import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

function flattenStudentRows(profiles) {
  return profiles.map((profile) => ({
    recordId: profile._id,
    userId: profile.user?._id,
    fullName: profile.user?.fullName || "N/A",
    email: profile.user?.email || "N/A",
    phoneNumber: profile.user?.phoneNumber || "",
    studentId: profile.studentId || "N/A",
    className: profile.class?.className || "N/A",
    academicYear: profile.academicYear || profile.class?.academicYear || "",
    status: profile.user?.isActive ? "Active" : "Inactive",
  }));
}

function flattenTeacherRows(teachers) {
  return teachers.map((teacher) => ({
    recordId: teacher._id,
    userId: teacher._id,
    fullName: teacher.fullName || "N/A",
    email: teacher.email || "N/A",
    phoneNumber: teacher.phoneNumber || "",
    teacherId: teacher.teacherId || "",
    assignedSubjectCode: teacher.assignedSubjectCode || "N/A",
    assignedClassName: teacher.assignedClassName || "N/A",
    status: teacher.isActive ? "Active" : "Inactive",
  }));
}

function flattenUserRows(users) {
  return users.map((user) => ({
    recordId: user._id,
    userId: user._id,
    fullName: user.fullName || "N/A",
    email: user.email || "N/A",
    phoneNumber: user.phoneNumber || "",
    role: user.role,
    teacherId: user.teacherId || "",
    parentId: user.parentId || "",
    relationship: user.relationship || "",
    status: user.isActive ? "Active" : "Inactive",
  }));
}

function UserRecordsTable({
  title,
  listEndpoint,
  listType = "user",
  listFilter,
  token,
  refreshKey,
  onSaved,
  onError,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRow, setEditingRow] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);

  const academicYearOptions = useMemo(() => {
    const years = [
      ...new Set(classes.map((classItem) => classItem.academicYear).filter(Boolean)),
    ];

    if (years.length > 0) {
      return years.sort();
    }

    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1].map(String);
  }, [classes]);

  useEffect(() => {
    const loadOptions = async () => {
      if (!token || (listType !== "teacher" && listType !== "student")) return;

      try {
        if (listType === "teacher") {
          const [subjectsRes, classesRes] = await Promise.all([
            api.get("/subjects", {
              headers: { Authorization: `Bearer ${token}` },
            }),
            api.get("/classes", {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);

          setSubjects(subjectsRes.data || []);
          setClasses(classesRes.data || []);
          return;
        }

        const classesRes = await api.get("/classes", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setClasses(classesRes.data || []);
      } catch (loadError) {
        onError(
          loadError.response?.data?.message ||
            "Failed to load class options"
        );
      }
    };

    loadOptions();
  }, [listType, token, onError]);

  useEffect(() => {
    const fetchRows = async () => {
      try {
        setLoading(true);
        onError("");

        const res = await api.get(listEndpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const rawRows =
          listType === "student"
            ? flattenStudentRows(res.data)
            : listType === "teacher"
            ? flattenTeacherRows(res.data)
            : flattenUserRows(res.data);

        setRows(listFilter ? rawRows.filter(listFilter) : rawRows);
      } catch (fetchError) {
        onError(
          fetchError.response?.data?.message ||
            "Failed to load records"
        );
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    if (token && listEndpoint) {
      fetchRows();
    }
  }, [listEndpoint, listFilter, listType, onError, refreshKey, token]);

  const columns = useMemo(() => {
    if (listType === "student") {
      return [
        "fullName",
        "email",
        "studentId",
        "className",
        "academicYear",
        "phoneNumber",
        "status",
      ];
    }

    if (listType === "teacher") {
      return [
        "fullName",
        "email",
        "teacherId",
        "assignedSubjectCode",
        "assignedClassName",
        "phoneNumber",
        "status",
      ];
    }

    if (listType === "admin") {
      return ["fullName", "email", "phoneNumber", "status"];
    }

    if (listFilter) {
      return [
        "fullName",
        "email",
        "parentId",
        "relationship",
        "status",
      ];
    }

    return ["fullName", "email", "role", "phoneNumber", "status"];
  }, [listFilter, listType, rows]);

  const openEdit = (row) => {
    setEditingRow(row);
    setFormValues({ ...row });
  };

  const closeEdit = () => {
    setEditingRow(null);
    setFormValues({});
  };

  const saveEdit = async () => {
    try {
      onError("");

      if (listType === "student") {
        await api.put(
          `/student-profiles/${editingRow.recordId}`,
          {
            fullName: formValues.fullName,
            email: formValues.email,
            phoneNumber: formValues.phoneNumber,
            studentId: formValues.studentId,
            className: formValues.className,
            academicYear: formValues.academicYear,
            status: formValues.status,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else if (listType === "admin" || listType === "teacher") {
        await api.put(
          `/users/${editingRow.userId}`,
          {
            fullName: formValues.fullName,
            email: formValues.email,
            phoneNumber: formValues.phoneNumber,
            ...(listType === "teacher"
              ? {
                  teacherId: formValues.teacherId,
                  assignedSubject: formValues.assignedSubjectCode,
                  assignedClass: formValues.assignedClassName,
                }
              : {}),
            status: formValues.status,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await api.put(
          `/users/${editingRow.userId}`,
          {
            fullName: formValues.fullName,
            email: formValues.email,
            phoneNumber: formValues.phoneNumber,
            parentId: formValues.parentId,
            relationship: formValues.relationship,
            status: formValues.status,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      onSaved("Record updated successfully.");
      closeEdit();
    } catch (saveError) {
      onError(
        saveError.response?.data?.message ||
          "Failed to update record"
      );
    }
  };

  const deleteRow = async (row) => {
    const confirmed = window.confirm(
      `Delete ${row.fullName}? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      onError("");

      if (listType === "student") {
        await api.delete(`/student-profiles/${row.recordId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await api.delete(`/users/${row.userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      onSaved("Record deleted successfully.");
    } catch (deleteError) {
      onError(
        deleteError.response?.data?.message ||
          "Failed to delete record"
      );
    }
  };

  if (loading) {
    return <p className="mt-8 text-slate-600">Loading records...</p>;
  }

  return (
    <div className="mt-8">
      <h2 className="mb-4 text-2xl font-bold">{title}</h2>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
          No records found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  {columns.map((column) => (
                    <th key={column} className="whitespace-nowrap p-3 font-bold">
                      {column
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (letter) => letter.toUpperCase())}
                    </th>
                  ))}
                  <th className="whitespace-nowrap p-3 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.recordId} className="border-t border-slate-200">
                    {columns.map((column) => (
                      <td key={column} className="p-3 text-slate-700">
                        {row[column] || "N/A"}
                      </td>
                    ))}
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteRow(row)}
                          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-xl font-bold">Edit Record</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <EditField
                label="Full Name"
                value={formValues.fullName}
                onChange={(value) =>
                  setFormValues((current) => ({ ...current, fullName: value }))
                }
              />
              <EditField
                label="Email"
                value={formValues.email}
                onChange={(value) =>
                  setFormValues((current) => ({ ...current, email: value }))
                }
              />
              <EditField
                label="Phone Number"
                value={formValues.phoneNumber}
                onChange={(value) =>
                  setFormValues((current) => ({ ...current, phoneNumber: value }))
                }
              />

              {listType === "student" && (
                <>
                  <EditField
                    label="Student ID"
                    value={formValues.studentId}
                    onChange={(value) =>
                      setFormValues((current) => ({ ...current, studentId: value }))
                    }
                  />
                  <EditSelectField
                    label="Class Name"
                    value={formValues.className}
                    placeholder="Select class"
                    options={classes.map((classItem) => ({
                      value: classItem.className,
                      label: classItem.className,
                    }))}
                    onChange={(value) => {
                      const selectedClass = classes.find(
                        (classItem) => classItem.className === value
                      );

                      setFormValues((current) => ({
                        ...current,
                        className: value,
                        academicYear:
                          selectedClass?.academicYear || current.academicYear,
                      }));
                    }}
                  />
                  <EditSelectField
                    label="Academic Year"
                    value={formValues.academicYear}
                    placeholder="Select academic year"
                    options={academicYearOptions.map((year) => ({
                      value: year,
                      label: year,
                    }))}
                    onChange={(value) =>
                      setFormValues((current) => ({ ...current, academicYear: value }))
                    }
                  />
                </>
              )}

              {listType === "teacher" && (
                <>
                  <EditField
                    label="Teacher ID"
                    value={formValues.teacherId}
                    onChange={(value) =>
                      setFormValues((current) => ({ ...current, teacherId: value }))
                    }
                  />
                  <EditSelectField
                    label="Assigned Subject Code"
                    value={formValues.assignedSubjectCode}
                    placeholder="Select subject"
                    options={subjects.map((subject) => ({
                      value: subject.subjectCode,
                      label: `${subject.subjectCode} - ${subject.subjectName}`,
                    }))}
                    onChange={(value) =>
                      setFormValues((current) => ({
                        ...current,
                        assignedSubjectCode: value,
                      }))
                    }
                  />
                  <EditSelectField
                    label="Assigned Class Name"
                    value={formValues.assignedClassName}
                    placeholder="Select class"
                    options={classes.map((classItem) => ({
                      value: classItem.className,
                      label: classItem.className,
                    }))}
                    onChange={(value) =>
                      setFormValues((current) => ({
                        ...current,
                        assignedClassName: value,
                      }))
                    }
                  />
                </>
              )}

              {formValues.parentId !== undefined &&
                listType !== "teacher" &&
                listType !== "admin" && (
                <>
                  <EditField
                    label="Parent ID"
                    value={formValues.parentId}
                    onChange={(value) =>
                      setFormValues((current) => ({ ...current, parentId: value }))
                    }
                  />
                  <EditField
                    label="Relationship"
                    value={formValues.relationship}
                    onChange={(value) =>
                      setFormValues((current) => ({ ...current, relationship: value }))
                    }
                  />
                </>
              )}

              <label className="text-sm font-semibold text-slate-700">
                Status
                <select
                  value={formValues.status}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditSelectField({ label, value, onChange, options, placeholder }) {
  return (
    <label className="text-sm font-semibold text-slate-700">
      {label}
      <select
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function EditField({ label, value, onChange }) {
  return (
    <label className="text-sm font-semibold text-slate-700">
      {label}
      <input
        type="text"
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
      />
    </label>
  );
}

export default UserRecordsTable;
