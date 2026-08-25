import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import UserRecordsTable from "../components/UserRecordsTable";
import CommerceSubjectsPanel from "../components/CommerceSubjectsPanel";
import GeneratedReportsPanel from "../components/GeneratedReportsPanel";
import DatabaseBackupPanel from "../components/DatabaseBackupPanel";
import TablePagination from "../components/TablePagination";
import useClientTable from "../hooks/useClientTable";
import { isSuperAdmin } from "../utils/adminRoles";
import { toastError, toastSuccess } from "../utils/toastBridge";
import {
  dedupeClasses,
  findClassById,
  findClassIdForValues,
  toClassIdSelectOptions,
  toClassNameSelectOptions,
} from "../utils/classOptions";
import {
  ACADEMIC_YEAR_OPTIONS,
  CLASS_NAME_OPTIONS,
} from "../utils/classCatalog";
import {
  getPasswordStrength,
  validateRegistrationForm,
} from "../utils/registrationValidation";

/** Match a student profile to the selected class id (supports duplicate class rows). */
function studentMatchesSelectedClass(student, selectedClassId, classes = []) {
  if (!selectedClassId) return false;

  const studentClassId = String(student?.class?._id || student?.class || "");
  if (studentClassId && studentClassId === String(selectedClassId)) {
    return true;
  }

  const selectedClass =
    classes.find(
      (classItem) => String(classItem?._id) === String(selectedClassId)
    ) || null;
  const studentClass =
    student?.class && typeof student.class === "object" && student.class.className
      ? student.class
      : classes.find(
          (classItem) => String(classItem?._id) === studentClassId
        ) || null;

  if (!selectedClass?.className || !studentClass?.className) return false;

  const sameName =
    String(studentClass.className).trim().toLowerCase() ===
    String(selectedClass.className || "")
      .trim()
      .toLowerCase();
  const sameYear =
    !selectedClass.academicYear ||
    !studentClass.academicYear ||
    String(studentClass.academicYear) === String(selectedClass.academicYear);
  const sameGrade =
    !selectedClass.gradeLevel ||
    !studentClass.gradeLevel ||
    Number(selectedClass.gradeLevel) === Number(studentClass.gradeLevel);

  // Prefer name+year, but also accept name+grade when year strings differ
  // across duplicate seeded Class rows (common Marks vs Attendance gap).
  return sameName && (sameYear || sameGrade);
}

/** Marks: match exam class including name-only twins from the class catalog. */
function studentMatchesExamClass(student, exam, classes = []) {
  if (!exam) return false;

  const examClassId = exam.class?._id || exam.class;
  if (!examClassId) return false;

  const catalog = [...classes];
  if (exam.class && typeof exam.class === "object") {
    catalog.push(exam.class);
  }

  if (studentMatchesSelectedClass(student, examClassId, catalog)) {
    return true;
  }

  const examClass =
    exam.class && typeof exam.class === "object" && exam.class.className
      ? exam.class
      : catalog.find((item) => String(item?._id) === String(examClassId));
  const studentClassId = String(student?.class?._id || student?.class || "");
  const studentClass =
    student?.class && typeof student.class === "object" && student.class.className
      ? student.class
      : catalog.find((item) => String(item?._id) === studentClassId);

  if (!examClass?.className || !studentClass?.className) return false;

  const sameName =
    String(examClass.className).trim().toLowerCase() ===
    String(studentClass.className).trim().toLowerCase();
  const sameGrade =
    !examClass.gradeLevel ||
    !studentClass.gradeLevel ||
    Number(examClass.gradeLevel) === Number(studentClass.gradeLevel);

  return sameName && sameGrade;
}

/** Real-world class label: "Grade 13 — 13 Commerce A (2026)" */
function formatClassOptionLabel(item) {
  const grade = item.gradeLevel ? `Grade ${item.gradeLevel}` : null;
  const name = item.className || "Class";
  const year = item.academicYear ? ` (${item.academicYear})` : "";
  return grade ? `${grade} — ${name}${year}` : `${name}${year}`;
}

/** Exam label includes grade from linked class */
function formatExamOptionLabel(item) {
  const subject = item.subject?.subjectName || "Subject";
  const className = item.class?.className || "Class";
  const grade = item.class?.gradeLevel ? `G${item.class.gradeLevel}` : null;
  const classPart = grade ? `${grade} ${className}` : className;
  return `${item.examName} — ${subject} (${classPart})`;
}

const featureConfigs = {
  "/admin/users/add": {
    title: "Add New Admin",
    description: "Create a new administrator account for the system.",
    registerForm: true,
    rolePreset: "admin",
    registerEndpoint: "/auth/register-admin",
    listEndpoint: "/users",
    listTitle: "Registered Admins",
    listType: "admin",
    listFilter: (row) =>
      row.role === "admin" || row.role === "superadmin",
  },
  "/admin/users/add-teacher": {
    title: "Add Teacher",
    description: "Create a teacher account and assign subject/class links.",
    registerForm: true,
    rolePreset: "teacher",
    listEndpoint: "/users/teachers",
    listTitle: "Registered Teachers",
    listType: "teacher",
  },
  "/admin/users/add-student": {
    title: "Add Student",
    description: "Create a student account and create the student profile.",
    registerForm: true,
    rolePreset: "student",
    listEndpoint: "/student-profiles",
    listTitle: "Registered Students",
    listType: "student",
  },
  "/admin/users/add-parent": {
    title: "Add Parent",
    description: "Create a parent account and link it with a student profile.",
    registerForm: true,
    rolePreset: "parent",
    listEndpoint: "/users",
    listTitle: "Registered Parents",
    listType: "parent",
    listFilter: (row) => row.role === "parent",
  },
  "/admin/users": {
    title: "View Users",
    endpoint: "/users",
    // Teacher subject/class links belong on Add Teacher — do not surface
    // raw User.assignedSubject / assignedClass ObjectIds here (they show as N/A).
    tableColumns: [
      "fullName",
      "email",
      "role",
      "phoneNumber",
      "isActive",
      "createdAt",
    ],
  },
  "/admin/users/edit-disable": {
    title: "Disable User",
    description: "Deactivate user accounts. Disabled users cannot log in.",
    endpoint: "/users",
    rowAction: "disableUser",
    tableColumns: ["fullName", "email", "role", "phoneNumber", "isActive"],
  },
  "/admin/users/teachers": {
    title: "Teachers",
    endpoint: "/users",
    filter: (row) => row.role === "teacher",
    tableColumns: [
      "fullName",
      "email",
      "teacherId",
      "phoneNumber",
      "isActive",
      "createdAt",
    ],
  },
  "/admin/users/students": {
    title: "Students",
    endpoint: "/users",
    filter: (row) => row.role === "student",
    tableColumns: [
      "fullName",
      "email",
      "phoneNumber",
      "isActive",
      "createdAt",
    ],
  },
  "/admin/users/parents": {
    title: "Parents",
    endpoint: "/users",
    filter: (row) => row.role === "parent",
    tableColumns: [
      "fullName",
      "email",
      "parentId",
      "relationship",
      "phoneNumber",
      "isActive",
      "createdAt",
    ],
  },
  "/admin/classes": {
    title: "Classes",
    description:
      "Create A/L classes with an explicit Grade 12 or Grade 13 level. This drives exam and student filtering.",
    endpoint: "/classes",
    tableColumns: [
      "gradeLevel",
      "className",
      "stream",
      "medium",
      "academicYear",
    ],
    form: {
      endpoint: "/classes",
      method: "post",
      submitLabel: "Create Class",
      fields: [
        {
          name: "gradeLevel",
          label: "Grade Level",
          type: "select",
          required: true,
          options: [
            { value: "12", label: "Grade 12" },
            { value: "13", label: "Grade 13" },
          ],
        },
        {
          name: "className",
          label: "Class Name",
          type: "select",
          required: true,
          placeholder: "Select class name",
          dependsOn: "gradeLevel",
          options: CLASS_NAME_OPTIONS,
          filterOptionsBy: (option, values) =>
            String(option.gradeLevel) === String(values.gradeLevel),
        },
        {
          name: "stream",
          label: "Stream",
          type: "select",
          required: true,
          defaultValue: "Commerce",
          placeholder: "Select stream",
          options: [{ value: "Commerce", label: "Commerce Risk Assessment" }],
        },
        {
          name: "academicYear",
          label: "Academic Year",
          type: "select",
          required: true,
          defaultValue: String(new Date().getFullYear()),
          placeholder: "Select academic year",
          options: ACADEMIC_YEAR_OPTIONS,
        },
        {
          name: "assignedTeacher",
          label: "Assigned Teacher (Optional)",
          type: "searchable-async-select",
          optionsEndpoint: "/users/teachers",
          optionValue: "_id",
          allowEmpty: true,
          emptyLabel: "Not assigned",
          placeholder: "Select a teacher",
          getOptionLabel: (item) =>
            `${item.teacherId || "No ID"} — ${item.fullName || "Teacher"}`,
        },
      ],
    },
    extraForms: [
      {
        endpoint: "/classes",
        method: "put",
        idField: "classId",
        submitLabel: "Update Class",
        formTitle: "Edit Class",
        formDescription:
          "Select an existing class, change the fields, then save.",
        fields: [
          {
            name: "classId",
            label: "Class to edit",
            type: "async-select",
            required: true,
            omitFromPayload: true,
            skipDedupe: true,
            optionsEndpoint: "/classes",
            optionValue: "_id",
            getOptionLabel: formatClassOptionLabel,
          },
          {
            name: "gradeLevel",
            label: "Grade Level",
            type: "select",
            required: true,
            options: [
              { value: "12", label: "Grade 12" },
              { value: "13", label: "Grade 13" },
            ],
          },
          {
            name: "className",
            label: "Class Name",
            type: "select",
            required: true,
            placeholder: "Select class name",
            dependsOn: "gradeLevel",
            options: CLASS_NAME_OPTIONS,
            filterOptionsBy: (option, values) =>
              String(option.gradeLevel) === String(values.gradeLevel),
          },
          {
            name: "stream",
            label: "Stream",
            type: "select",
            required: true,
            defaultValue: "Commerce",
            placeholder: "Select stream",
            options: [{ value: "Commerce", label: "Commerce Risk Assessment" }],
          },
          {
            name: "academicYear",
            label: "Academic Year",
            type: "select",
            required: true,
            placeholder: "Select academic year",
            options: ACADEMIC_YEAR_OPTIONS,
          },
          {
            name: "assignedTeacher",
            label: "Assigned Teacher (Optional)",
            type: "searchable-async-select",
            optionsEndpoint: "/users/teachers",
            optionValue: "_id",
            allowEmpty: true,
            emptyLabel: "Not assigned",
            placeholder: "Select a teacher",
            getOptionLabel: (item) =>
              `${item.teacherId || "No ID"} — ${item.fullName || "Teacher"}`,
          },
        ],
      },
    ],
  },
  "/admin/subjects": {
    title: "Subjects",
    description:
      "Manage teaching assignments for the school’s A/L Commerce stream.",
    commerceSubjectsPanel: true,
  },
  "/admin/teacher-assignments": {
    title: "Teacher Assignments",
    endpoint: "/subjects",
    description:
      "Overview of each Commerce subject, its assigned teacher, and linked classes.",
    tableColumns: [
      "subjectCode",
      "subjectName",
      "assignedTeacher",
      "classes",
      "isActive",
    ],
  },
  "/admin/exam-timetables": {
    title: "Exam Timetables",
    description:
      "Add the schedule (time and room) for exams already created under Exams. One timetable entry per exam.",
    endpoint: "/exam-timetables",
    tableColumns: [
      "examName",
      "class",
      "subject",
      "examDate",
      "startTime",
      "endTime",
      "location",
    ],
    form: {
      endpoint: "/exam-timetables",
      method: "post",
      submitLabel: "Create Timetable",
      formTitle: "Create Exam Timetable",
      formDescription:
        "Select an exam from Exams, then set the start time, end time, and room.",
      fields: [
        {
          name: "examId",
          label: "Linked Exam",
          type: "async-select",
          required: true,
          placeholder: "Select exam (from Exams page)",
          optionsEndpoint: "/exams",
          optionValue: "_id",
          getOptionLabel: (item) => {
            const className = item.class?.className || "Class";
            const subjectName = item.subject?.subjectName || "Subject";
            const date = item.examDate
              ? new Date(item.examDate).toLocaleDateString("en-GB")
              : "";
            return `${item.examName || "Exam"} — ${className} — ${subjectName}${
              date ? ` (${date})` : ""
            }`;
          },
          hydrateMap: {
            examName: "examName",
            classId: "class",
            subjectId: "subject",
            examDate: "examDate",
          },
        },
        {
          name: "examName",
          label: "Exam Name",
          required: true,
          placeholder: "Filled from Linked Exam",
        },
        {
          name: "classId",
          label: "Class",
          type: "async-select",
          required: true,
          placeholder: "Filled from Linked Exam",
          optionsEndpoint: "/classes",
          optionValue: "_id",
          getOptionLabel: formatClassOptionLabel,
        },
        {
          name: "subjectId",
          label: "Subject",
          type: "async-select",
          required: true,
          placeholder: "Filled from Linked Exam",
          optionsEndpoint: "/subjects",
          optionValue: "_id",
          getOptionLabel: (item) =>
            `${item.subjectName}${item.subjectCode ? ` (${item.subjectCode})` : ""}`,
        },
        {
          name: "examDate",
          label: "Exam Date",
          type: "date",
          required: true,
        },
        {
          name: "startTime",
          label: "Start Time",
          type: "time",
          required: true,
        },
        {
          name: "endTime",
          label: "End Time",
          type: "time",
          required: true,
        },
        {
          name: "location",
          label: "Location",
          placeholder: "e.g. Main Hall",
          defaultValue: "Main Hall",
        },
        {
          name: "instructions",
          label: "Instructions",
          type: "textarea",
          placeholder: "Optional instructions for students...",
        },
      ],
    },
    extraForms: [
      {
        endpoint: "/exam-timetables",
        method: "put",
        idField: "timetableId",
        submitLabel: "Update Timetable",
        formTitle: "Edit Exam Timetable",
        formDescription:
          "Update time, room, or instructions. Linked exam details stay matched to Exams.",
        fields: [
          {
            name: "timetableId",
            label: "Timetable to edit",
            type: "async-select",
            required: true,
            omitFromPayload: true,
            optionsEndpoint: "/exam-timetables",
            optionValue: "_id",
            getOptionLabel: (item) =>
              `${item.examName || "Exam"} — ${item.class?.className || "Class"}`,
          },
          {
            name: "startTime",
            label: "Start Time",
            type: "time",
            required: true,
          },
          {
            name: "endTime",
            label: "End Time",
            type: "time",
            required: true,
          },
          {
            name: "location",
            label: "Location",
            placeholder: "e.g. Main Hall",
            defaultValue: "Main Hall",
          },
          {
            name: "instructions",
            label: "Instructions",
            type: "textarea",
            placeholder: "Optional instructions for students...",
          },
        ],
      },
      {
        endpoint: "/exam-timetables",
        method: "delete",
        idField: "timetableId",
        submitLabel: "Delete Timetable",
        formTitle: "Delete Exam Timetable",
        formDescription: "Select a timetable entry to permanently remove it.",
        fields: [
          {
            name: "timetableId",
            label: "Timetable to delete",
            type: "async-select",
            required: true,
            omitFromPayload: true,
            optionsEndpoint: "/exam-timetables",
            optionValue: "_id",
            getOptionLabel: (item) =>
              `${item.examName || "Exam"} — ${item.class?.className || "Class"}`,
          },
        ],
      },
    ],
  },
  "/admin/exams": {
    title: "Exams",
    description:
      "Create one exam per class and subject for marks, ranks, and Z-scores. After saving, add the time and room under Exam Timetables.",
    endpoint: "/exams",
    tableColumns: ["examName", "class", "subject", "examDate", "totalMarks"],
    form: {
      endpoint: "/exams",
      method: "post",
      submitLabel: "Create Exam",
      fields: [
        {
          name: "examName",
          label: "Exam Name",
          required: true,
          placeholder: "e.g. Term Test 1 - Accounting",
        },
        {
          name: "classId",
          label: "Class",
          type: "async-select",
          required: true,
          placeholder: "Select class",
          optionsEndpoint: "/classes",
          optionValue: "_id",
          getOptionLabel: formatClassOptionLabel,
        },
        {
          name: "subjectId",
          label: "Subject",
          type: "async-select",
          required: true,
          placeholder: "Select subject",
          optionsEndpoint: "/subjects",
          optionValue: "_id",
          getOptionLabel: (item) =>
            `${item.subjectName}${item.subjectCode ? ` (${item.subjectCode})` : ""}`,
        },
        {
          name: "examDate",
          label: "Exam Date",
          type: "date",
          required: true,
        },
        {
          name: "totalMarks",
          label: "Total Marks",
          type: "number",
          defaultValue: 100,
          placeholder: "100",
        },
      ],
    },
  },
  "/teacher/exams": {
    title: "Create Exam",
    description:
      "Create an exam for Marks Management. After creating, enter student marks from Marks Management.",
    endpoint: "/exams",
    tableColumns: ["examName", "class", "subject", "examDate", "totalMarks"],
    form: {
      endpoint: "/exams",
      method: "post",
      submitLabel: "Create Exam",
      fields: [
        {
          name: "examName",
          label: "Exam Name",
          required: true,
          placeholder: "e.g. Term Test 1 - Accounting",
        },
        {
          name: "classId",
          label: "Class",
          type: "async-select",
          required: true,
          placeholder: "Select class",
          optionsEndpoint: "/classes",
          optionValue: "_id",
          getOptionLabel: formatClassOptionLabel,
        },
        {
          name: "subjectId",
          label: "Subject",
          type: "async-select",
          required: true,
          placeholder: "Select subject",
          optionsEndpoint: "/subjects",
          optionValue: "_id",
          getOptionLabel: (item) =>
            `${item.subjectName}${item.subjectCode ? ` (${item.subjectCode})` : ""}`,
        },
        {
          name: "examDate",
          label: "Exam Date",
          type: "date",
          required: true,
        },
        {
          name: "totalMarks",
          label: "Total Marks",
          type: "number",
          defaultValue: 100,
          placeholder: "100",
        },
      ],
    },
  },
  "/admin/question-paper-details": {
    title: "Question Paper Details",
    description:
      "School-wide essay question papers created by teachers. Use this list to review what papers exist for each grade and subject.",
    endpoint: "/essays/questions?scope=department",
    tableColumns: [
      "gradeLevel",
      "question",
      "subject",
      "createdBy",
      "maxMarks",
      "createdAt",
    ],
    emptyMessage:
      "No question papers yet. Teachers add papers from Create Paper in the Teacher Workspace.",
  },
  "/admin/audit-logs": {
    // Dedicated AdminAuditLogs page handles this route in App.jsx.
    title: "Audit Logs",
    endpoint: "/audit-logs",
  },
  "/admin/database-backup": {
    title: "Database Backup",
    description:
      "Save a full copy of school records, or restore from an earlier backup if something goes wrong.",
    databaseBackupPanel: true,
  },
  "/admin/contact-messages": {
    title: "Contact Messages",
    description: "Inquiries submitted from the public Contact page.",
    endpoint: "/contact",
  },
  "/admin/reports": {
    title: "Reports",
    description:
      "Generate monthly student progress PDFs, then download them from the list below.",
    action: {
      endpoint: "/reports/monthly-generate-test",
      method: "post",
      label: "Generate Monthly Reports",
    },
    generatedReportsPanel: true,
  },
  "/admin/settings": {
    title: "Settings",
    description:
      "Configure school-wide settings. Pass mark is used for grades (S/F), pass rates, and weak-student risk checks.",
    endpoint: "/settings",
    layout: "summary",
    summaryFields: [
      { label: "School Name", path: "schoolName" },
      { label: "Academic Year", path: "academicYear" },
      { label: "Pass Mark", path: "passMark" },
      { label: "Support Email", path: "supportEmail" },
      { label: "Timezone", path: "timezone" },
    ],
    form: {
      endpoint: "/settings",
      method: "put",
      submitLabel: "Save Settings",
      loadEndpoint: "/settings",
      formTitle: "Update System Settings",
      formDescription:
        "Edit school details below. Pass mark changes apply to new results and analytics immediately.",
      fields: [
        {
          name: "schoolName",
          label: "School Name",
          required: true,
          placeholder: "e.g. EduTrack Smart Learning System",
        },
        {
          name: "academicYear",
          label: "Academic Year",
          required: true,
          placeholder: "e.g. 2026",
        },
        {
          name: "passMark",
          label: "Pass Mark",
          type: "number",
          required: true,
          defaultValue: 40,
          placeholder: "40",
        },
        {
          name: "supportEmail",
          label: "Support Email",
          type: "email",
          placeholder: "admin@edutrack.lk",
        },
        {
          name: "timezone",
          label: "Timezone",
          defaultValue: "Asia/Colombo",
          placeholder: "Asia/Colombo",
        },
      ],
    },
  },
  "/teacher/classes": {
    title: "My Classes",
    description: "Classes assigned to you for teaching and attendance.",
    endpoint: "/classes?assignedOnly=true",
    tableColumns: [
      "className",
      "stream",
      "medium",
      "academicYear",
      "gradeLevel",
      "students",
      "isActive",
    ],
  },
  "/teacher/subjects": {
    title: "My Subjects",
    description: "Subjects assigned to you.",
    endpoint: "/subjects",
    tableColumns: ["subjectName", "subjectCode", "isActive"],
  },
  "/teacher/create-paper": {
    title: "Create Paper",
    description:
      "Create a new essay question paper for Grade 12 or Grade 13 students. Select grade and subject by name.",
    endpoint: "/essays/questions",
    tableColumns: ["gradeLevel", "question", "subject", "maxMarks", "createdAt"],
    form: {
      endpoint: "/essays/questions",
      method: "post",
      submitLabel: "Create Paper",
      fields: [
        {
          name: "gradeLevel",
          label: "Grade Level",
          type: "select",
          required: true,
          options: [
            { value: "12", label: "Grade 12" },
            { value: "13", label: "Grade 13" },
          ],
        },
        {
          name: "subject",
          label: "Subject",
          type: "async-select",
          required: true,
          placeholder: "Select subject",
          optionsEndpoint: "/subjects",
          optionValue: "_id",
          getOptionLabel: (item) =>
            `${item.subjectName}${item.subjectCode ? ` (${item.subjectCode})` : ""}`,
        },
        {
          name: "question",
          label: "Question",
          type: "textarea",
          required: true,
          placeholder: "Type the essay question students will answer...",
        },
        {
          name: "maxMarks",
          label: "Max Marks",
          type: "number",
          defaultValue: 10,
          placeholder: "10",
        },
      ],
    },
  },
  "/teacher/question-bank": {
    // Legacy URL — same list as My Papers; redirect keeps old bookmarks working.
    redirectTo: "/teacher/papers",
  },
  "/teacher/marking-schemes": {
    title: "Marking Schemes",
    description:
      "Create a marking scheme for an essay question. Select the paper by its question text.",
    endpoint: "/essays/marking-schemes",
    tableColumns: ["question", "keywords", "modelAnswer"],
    emptyMessage:
      "No marking schemes yet. Create a paper first, then add keywords and a model answer here.",
    form: {
      endpoint: "/essays/marking-schemes",
      method: "post",
      submitLabel: "Create Marking Scheme",
      fields: [
        {
          name: "question",
          label: "Essay Paper",
          type: "async-select",
          required: true,
          placeholder: "Select essay question",
          optionsEndpoint: "/essays/questions",
          optionValue: "_id",
          getOptionLabel: (item) => {
            const text = item.question || "Untitled question";
            const short =
              text.length > 80 ? `${text.slice(0, 80)}...` : text;
            const subject = item.subject?.subjectName;
            const grade = item.gradeLevel ? `G${item.gradeLevel}` : null;
            const parts = [short];
            if (grade) parts.push(grade);
            if (subject) parts.push(subject);
            return parts.join(" — ");
          },
        },
        {
          name: "keywords",
          label: "Keywords",
          required: true,
          placeholder: "comma,separated,keywords",
          transform: "csv",
        },
        {
          name: "modelAnswer",
          label: "Model Answer",
          type: "textarea",
          placeholder: "Ideal answer used for marking guidance...",
        },
      ],
    },
  },
  "/teacher/papers": {
    // Dedicated TeacherPapers page handles this route in App.jsx.
    title: "My Papers",
    endpoint: "/essays/questions",
    tableColumns: ["gradeLevel", "question", "subject", "maxMarks", "createdAt"],
  },
  "/teacher/submissions": {
    // Dedicated TeacherSubmissions page handles this route in App.jsx.
    title: "Student Submissions",
    endpoint: "/essays/submissions",
  },
  "/teacher/marks": {
    title: "Marks Management",
    description:
      "Select one of your subject exams, choose a student from that exam’s class, enter marks out of 100, then save. Grade, rank, and Z-score are calculated automatically. Use Edit Existing Result to correct a saved mark.",
    endpoint: "/results",
    tableColumns: ["student", "exam", "marks", "grade", "rank", "zScore"],
    emptyMessage:
      "No results yet. Create an exam for your subject, then add student marks here.",
    form: {
      endpoint: "/results",
      method: "post",
      submitLabel: "Add Result",
      formTitle: "Add Exam Result",
      formDescription:
        "Pick the exam first. The student list then shows learners in that exam’s class (same as Attendance).",
      extraOptionEndpoints: ["/classes"],
      fields: [
        {
          name: "exam",
          label: "Exam",
          type: "async-select",
          required: true,
          placeholder: "Select exam",
          optionsEndpoint: "/exams",
          optionValue: "_id",
          getOptionLabel: formatExamOptionLabel,
          emptyOptionsMessage:
            "No exams for your subject yet. Create one under Create Exam, then return here.",
        },
        {
          name: "student",
          label: "Student",
          type: "async-select",
          required: true,
          placeholder: "Select student",
          optionsEndpoint: "/student-profiles",
          optionValue: "_id",
          dependsOn: "exam",
          // Reload from API with exam class (expands duplicate class rows +
          // attendance-linked students). Falls back to client class matching.
          getOptionsQuery: (values, asyncOptions) => {
            const exams = resolveAsyncOptionItems(
              { optionsEndpoint: "/exams" },
              asyncOptions
            );
            const selectedExam = exams.find(
              (exam) => String(exam._id) === String(values.exam)
            );
            const classId =
              selectedExam?.class?._id || selectedExam?.class || "";
            return classId ? { classId: String(classId) } : null;
          },
          // Server returns the exam-class roster (twins + attendance-linked).
          filterBy: (_item, values) => Boolean(values.exam),
          getOptionLabel: (item) => {
            const name = item.user?.fullName || "Student";
            const code = item.studentId || "No ID";
            return `${name} (${code})`;
          },
          emptyOptionsMessage:
            "No students found for this exam’s class. Check Attendance for the same class, or ask admin to assign the student.",
        },
        {
          name: "marks",
          label: "Marks (0–100)",
          type: "number",
          required: true,
          placeholder: "e.g. 72",
        },
      ],
    },
    extraForms: [
      {
        endpoint: "/results",
        method: "put",
        idField: "resultId",
        submitLabel: "Update Result Marks",
        formTitle: "Edit Existing Result",
        formDescription:
          "Select a saved result and enter the corrected marks (0–100).",
        fields: [
          {
            name: "resultId",
            label: "Result to edit",
            type: "async-select",
            required: true,
            omitFromPayload: true,
            optionsEndpoint: "/results",
            optionValue: "_id",
            getOptionLabel: (item) => {
              const studentName =
                item.student?.user?.fullName ||
                item.student?.studentId ||
                "Student";
              const examName = item.exam?.examName || "Exam";
              return `${studentName} — ${examName} (${item.marks})`;
            },
          },
          {
            name: "marks",
            label: "Corrected Marks",
            type: "number",
            required: true,
            placeholder: "e.g. 72",
          },
        ],
      },
    ],
  },
  "/teacher/attendance": {
    title: "Attendance Management",
    description:
      "Select a class and student by name, then mark Present or Absent.",
    endpoint: "/attendance",
    tableColumns: ["student", "class", "date", "status"],
    emptyMessage:
      "No attendance records yet. Select a class and student above, then mark Present or Absent.",
    form: {
      endpoint: "/attendance",
      method: "post",
      submitLabel: "Mark Attendance",
      formDescription:
        "Choose the class first, then the student, date, and attendance status.",
      fields: [
        {
          name: "classId",
          label: "Class",
          type: "async-select",
          required: true,
          placeholder: "Select class",
          optionsEndpoint: "/classes",
          optionValue: "_id",
          getOptionLabel: formatClassOptionLabel,
        },
        {
          name: "student",
          label: "Student",
          type: "async-select",
          required: true,
          placeholder: "Select student",
          optionsEndpoint: "/student-profiles",
          optionValue: "_id",
          dependsOn: "classId",
          filterBy: (item, values, asyncOptions) =>
            studentMatchesSelectedClass(
              item,
              values.classId,
              resolveAsyncOptionItems(
                { optionsEndpoint: "/classes" },
                asyncOptions
              )
            ),
          getOptionLabel: (item) => {
            const name = item.user?.fullName || "Student";
            const code = item.studentId || "No ID";
            return `${name} (${code})`;
          },
          emptyOptionsMessage:
            "No students found for this class. Ask admin to assign students to the class.",
        },
        {
          name: "date",
          label: "Date",
          type: "date",
          required: true,
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          required: true,
          defaultValue: "Present",
          placeholder: "Select status",
          options: [
            { value: "Present", label: "Present" },
            { value: "Absent", label: "Absent" },
          ],
        },
      ],
    },
  },
  "/teacher/weak-students": {
    title: "Weak Student Detection",
    endpoint: "/risk-notifications",
  },
  "/teacher/reports": {
    title: "Reports",
    endpoint: "/results/analytics-summary",
    layout: "cards",
  },
  "/student/subjects": {
    title: "My Subjects",
    description: "Subjects assigned to your student profile.",
    endpoint: "/student-dashboard",
    dataPath: "student.subjects",
    layout: "grid",
    cardTitleKey: "subjectName",
    cardDescriptionKey: "subjectCode",
  },
  "/student/exam-papers": {
    title: "Exam Papers",
    description: "Available essay questions for practice and submission.",
    endpoint: "/essays/questions",
    tableColumns: ["question", "maxMarks", "createdAt"],
  },
  "/student/revision-timetable": {
    title: "Revision Timetable",
    description: "Upcoming exam revision plan based on your performance.",
    endpoint: "/study-planner/revision-timetable",
    dataPath: "timetable",
    tableColumns: [
      "examName",
      "subject",
      "examDate",
      "daysRemaining",
      "priority",
      "dailyStudyHours",
      "recommendation",
    ],
    emptyMessage: (data) =>
      data?.message ||
      "No upcoming exams are scheduled for your class yet. When a teacher adds an exam with a future date, your revision plan will appear here.",
  },
  "/student/badges": {
    title: "Achievement Badges",
    description: "Badges earned from attendance, marks, and learning progress.",
    endpoint: "/badges/student",
    layout: "grid",
    dataPath: "badges",
    cardTitleKey: "title",
    cardDescriptionKey: "description",
    cardMetaKey: "icon",
    emptyMessage:
      "Complete exams and maintain high performance to earn badges.",
  },
  "/student/attendance-vs-marks": {
    title: "Attendance vs Marks",
    description: "How your attendance relates to your average marks.",
    endpoint: "/analytics/attendance-marks",
    tableColumns: ["studentId", "attendance", "averageMarks"],
    emptyMessage:
      "Complete at least one examination to view attendance and marks data.",
  },
  "/student/study-materials": {
    title: "Study Materials",
    description: "Recommended notes, topics, and learning resources.",
    endpoint: "/content-recommendations",
    tableColumns: ["noteTitle", "topic", "difficultyLevel", "noteDescription"],
    emptyMessage:
      "Study recommendations will appear after enough academic data is available.",
  },
  "/student/change-password": {
    title: "Change Password",
    description: "Update your account password securely.",
    form: {
      endpoint: "/auth/change-password",
      method: "put",
      submitLabel: "Update Password",
      fields: [
        {
          name: "currentPassword",
          label: "Current Password",
          type: "password",
          required: true,
        },
        {
          name: "newPassword",
          label: "New Password",
          type: "password",
          required: true,
        },
        {
          name: "confirmPassword",
          label: "Confirm New Password",
          type: "password",
          required: true,
        },
      ],
    },
  },
  "/parent/child-overview": {
    title: "Child Overview",
    description:
      "Profile and current academic status for your linked child.",
    endpoint: "/parent-dashboard",
    layout: "summary",
    summaryFields: [
      { label: "Student Name", path: "student.user.fullName" },
      { label: "Student ID", path: "student.studentId" },
      { label: "Class", path: "student.class.className" },
      { label: "Attendance", path: "attendancePercentage", suffix: "%" },
      { label: "Risk Status", path: "latestCommerceRiskLevel" },
      { label: "Overall Average", path: "overallAverage" },
      { label: "Latest Exam", path: "latestResult.exam.examName" },
      { label: "Latest Marks", path: "latestResult.marks" },
      { label: "Latest Grade", path: "latestResult.grade" },
    ],
    emptyMessage: "No linked child profile found for this parent account.",
  },
  "/parent/marks-rankings": {
    title: "Marks & Rankings",
    endpoint: "/parent-dashboard",
    dataPath: "results",
  },
  "/parent/monthly-performance": {
    title: "Monthly Performance",
    endpoint: "/parent-dashboard",
    dataPath: "monthlyPerformance",
  },
  "/parent/attendance": {
    title: "Attendance",
    description: "Daily attendance records for your linked child.",
    endpoint: "/parent-dashboard",
    dataPath: "attendanceRecords",
    tableColumns: ["date", "student", "className", "status"],
    emptyMessage: "No attendance records yet for your child.",
  },
  "/parent/risk-alerts": {
    title: "Risk Alerts",
    endpoint: "/risk-notifications",
  },
  "/parent/attendance-vs-grades": {
    title: "Attendance vs Grades",
    endpoint: "/analytics/attendance-grades",
    tableColumns: ["period", "attendance", "averageMarks", "grade"],
    emptyMessage:
      "More attendance and examination records are required to calculate the correlation.",
  },
  "/parent/progress-reports": {
    title: "Progress Reports",
    description: "Download the latest progress report PDF.",
    action: {
      endpoint: "/reports/student-report",
      method: "get",
      label: "Download Progress Report",
      responseType: "blob",
      downloadName: "student-progress-report.pdf",
    },
  },
};

function DashboardFeaturePage() {
  const { pathname } = useLocation();
  const { token, user } = useAuth();

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const config = getFeatureConfig(pathname, user);
  const displayData = config.profileData || getValueByPath(data, config.dataPath);
  const resolvedEmptyMessage = resolveEmptyMessage(config, data);

  const rows = useMemo(() => {
    let normalized = normalizeData(displayData);
    if (config.filter) {
      normalized = normalized.filter(config.filter);
    }

    // Normal admins can disable Teacher/Student/Parent only.
    if (pathname === "/admin/users/edit-disable" && !isSuperAdmin(user)) {
      normalized = normalized.filter(
        (row) => row.role !== "admin" && row.role !== "superadmin"
      );
    }

    return normalized;
  }, [config, displayData, pathname, user]);

  useEffect(() => {
    const fetchData = async () => {
      if (!config.endpoint || config.profileData) return;

      try {
        setLoading(true);
        setError("");

        const res = await api.get(config.endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setData(res.data);
      } catch (fetchError) {
        const fetchMessage =
          fetchError.response?.data?.message ||
          fetchError.message ||
          "Failed to load data";
        setError(fetchMessage);
        toastError(fetchMessage);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [config.endpoint, config.profileData, refreshKey, token]);

  const runAction = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.request({
        url: config.action.endpoint,
        method: config.action.method,
        responseType: config.action.responseType,
        headers: { Authorization: `Bearer ${token}` },
        skipToast: config.action.responseType === "blob",
      });

      if (config.action.responseType === "blob") {
        downloadBlob(res.data, config.action.downloadName);
        toastSuccess("Download started successfully.");
      } else if (!res.data?.message) {
        toastSuccess("Action completed successfully.");
      }

      if (config.endpoint) {
        const refresh = await api.get(config.endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(refresh.data);
      } else if (config.action.responseType !== "blob") {
        setData(res.data);
      }

      // Refresh generated-reports list after a successful generate action.
      if (config.generatedReportsPanel) {
        setRefreshKey((current) => current + 1);
      }
    } catch (actionError) {
      const actionMessage =
        actionError.response?.data?.message ||
        actionError.message ||
        "Action failed";
      setError(actionMessage);
      if (config.action.responseType === "blob") {
        toastError(actionMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaved = () => {
    setRefreshKey((current) => current + 1);
  };

  const handleFeedbackError = (feedback) => {
    setError(feedback || "");
    if (feedback) toastError(feedback);
  };

  return config.redirectTo ? (
    <Navigate to={config.redirectTo} replace />
  ) : (
    <div className="p-6">
      {pathname === "/admin/users/add" && !isSuperAdmin(user) ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-800">
          Only a Super Admin can add administrator accounts.
        </div>
      ) : (
        <>
      <PageHeader
        role={user?.role}
        title={config.title}
        description={config.description}
      />

      {config.form && (
        <FeatureForm
          form={config.form}
          token={token}
          onSaved={handleSaved}
          onError={handleFeedbackError}
        />
      )}

      {(config.extraForms || []).map((extraForm) => (
        <FeatureForm
          key={extraForm.formTitle || extraForm.endpoint}
          form={extraForm}
          token={token}
          onSaved={handleSaved}
          onError={handleFeedbackError}
        />
      ))}

      {config.registerForm && (
        <RegisterUserForm
          rolePreset={config.rolePreset}
          registerEndpoint={config.registerEndpoint}
          token={token}
          onSaved={handleSaved}
          onError={handleFeedbackError}
        />
      )}

      {config.commerceSubjectsPanel && (
        <CommerceSubjectsPanel
          token={token}
          refreshKey={refreshKey}
          onSaved={handleSaved}
          onError={handleFeedbackError}
        />
      )}

      {config.action && (
        <button
          type="button"
          onClick={runAction}
          disabled={loading}
          className="mb-6 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {loading ? "Working..." : config.action.label}
        </button>
      )}

      {config.generatedReportsPanel && (
        <GeneratedReportsPanel
          token={token}
          refreshKey={refreshKey}
          onError={handleFeedbackError}
        />
      )}

      {config.databaseBackupPanel && (
        <DatabaseBackupPanel
          token={token}
          refreshKey={refreshKey}
          onSaved={handleSaved}
          onError={handleFeedbackError}
        />
      )}

      {config.listEndpoint && (
        <UserRecordsTable
          title={config.listTitle || "Records"}
          listEndpoint={config.listEndpoint}
          listType={config.listType || "user"}
          listFilter={config.listFilter}
          token={token}
          refreshKey={refreshKey}
          onSaved={handleSaved}
          onError={handleFeedbackError}
        />
      )}

      {loading && config.endpoint ? (
        <LoadingPanel />
      ) : config.layout === "summary" ? (
        <SummaryPanel data={displayData} fields={config.summaryFields || []} />
      ) : config.layout === "grid" ? (
        <GridCardPanel
          rows={rows}
          titleKey={config.cardTitleKey}
          descriptionKey={config.cardDescriptionKey}
          metaKey={config.cardMetaKey}
          emptyMessage={resolvedEmptyMessage}
          emptyIcon={config.emptyIcon}
        />
      ) : config.layout === "cards" ? (
        <CardPanel data={displayData} />
      ) : config.endpoint || config.profileData ? (
        <DataTable
          data={displayData}
          rows={rows}
          rowAction={config.rowAction}
          tableColumns={config.tableColumns}
          currentUserId={user?.id || user?._id}
          currentUserTeacherId={user?.teacherId || ""}
          token={token}
          emptyMessage={resolvedEmptyMessage}
          emptyIcon={config.emptyIcon}
          onSaved={handleSaved}
          onError={handleFeedbackError}
        />
      ) : config.form ||
        config.registerForm ||
        config.action ||
        config.commerceSubjectsPanel ||
        config.generatedReportsPanel ||
        config.databaseBackupPanel ? null : (
        <EmptyState />
      )}
        </>
      )}
    </div>
  );
}

function PageHeader({ role, title, description }) {
  const workspaceLabel =
    role === "superadmin"
      ? "Super Administrator"
      : role === "admin"
        ? "Administrator"
        : role || "Dashboard";

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="typo-eyebrow text-blue-700">
        {workspaceLabel} Workspace
      </p>
      <h1 className="mt-2 typo-page text-slate-950">
        {title}
      </h1>
      {description && (
        <p className="mt-2 max-w-3xl typo-body text-slate-600">
          {description}
        </p>
      )}
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="typo-ui text-slate-600">Loading data...</p>
    </div>
  );
}

function getInitialRegistrationValues(rolePreset) {
  return {
    fullName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    role: rolePreset || "teacher",
    status: "Active",
    teacherId: "",
    assignedSubject: "",
    assignedClass: "",
    studentId: "",
    className: "",
    academicYear: "",
    parent: "",
    parentId: "",
    childStudent: "",
    relationship: "",
  };
}

function getCreatingLabel(role) {
  if (role === "admin") return "Creating Admin...";
  if (role === "teacher") return "Creating Teacher...";
  if (role === "student") return "Creating Student...";
  if (role === "parent") return "Creating Parent...";
  return "Creating...";
}

function buildRegistrationSuccessMessage(baseMessage, role, responseData) {
  const generated = responseData?.generatedIds || {};
  if (role === "student" && (generated.studentId || responseData?.profile?.studentId)) {
    return `${baseMessage} Student ID: ${
      generated.studentId || responseData.profile.studentId
    }`;
  }
  if (role === "teacher" && (generated.teacherId || responseData?.user?.teacherId)) {
    return `${baseMessage} Teacher ID: ${
      generated.teacherId || responseData.user.teacherId
    }`;
  }
  if (role === "parent" && (generated.parentId || responseData?.user?.parentId)) {
    return `${baseMessage} Parent ID: ${
      generated.parentId || responseData.user.parentId
    }`;
  }
  return baseMessage;
}

function AutoIdNotice({ label }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      <span
        className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sky-100 text-sky-700"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-3.5 w-3.5"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-4a.75.75 0 01.75.75v.5a.75.75 0 01-1.5 0v-.5A.75.75 0 0110 6zm0 3a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 9z"
            clipRule="evenodd"
          />
        </svg>
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-700">{label}</p>
        <p className="mt-0.5 text-sm text-slate-600">
          Automatically generated after account creation.
        </p>
      </div>
    </div>
  );
}

function formatStudentOptionLabel(profile) {
  const studentCode = profile.studentId || "No ID";
  const fullName = profile.user?.fullName || "Student";
  const className = profile.class?.className || "No class";
  return `${studentCode} — ${fullName} — ${className}`;
}

function SearchableStudentSelect({
  label,
  students,
  value,
  onChange,
  error,
  required = false,
}) {
  const options = useMemo(
    () =>
      students.map((student) => ({
        value: String(student._id),
        label: formatStudentOptionLabel(student),
        searchText: [
          student.studentId,
          student.user?.fullName,
          student.user?.email,
          student.class?.className,
        ]
          .filter(Boolean)
          .join(" "),
      })),
    [students]
  );

  return (
    <SearchableOptionSelect
      label={label}
      required={required}
      value={value}
      options={options}
      placeholder="Search by student name or ID"
      error={error}
      onChange={onChange}
    />
  );
}

function SearchableOptionSelect({
  label,
  value,
  options,
  onChange,
  placeholder = "Search and select",
  required = false,
  disabled = false,
  error = "",
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => options.find((option) => String(option.value) === String(value)),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;

    return options.filter((option) => {
      const haystack = `${option.label} ${option.searchText || ""}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [options, query]);

  return (
    <div className="relative">
      <label className="typo-label text-slate-700">
        {label}
        {required ? " *" : ""}
      </label>
      <input
        type="search"
        disabled={disabled}
        value={open ? query : selected ? selected.label : query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          if (value) onChange("");
        }}
        onFocus={() => {
          if (disabled) return;
          setOpen(true);
          setQuery("");
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150);
        }}
        placeholder={placeholder}
        className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm outline-none ring-blue-600/30 transition focus:border-blue-500 focus:ring disabled:bg-slate-100 ${
          error ? "border-red-400" : "border-slate-300"
        }`}
        autoComplete="off"
      />

      {open && !disabled && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {filteredOptions.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-500">No matches found.</p>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={`${option.value || "empty"}-${option.label}`}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(String(option.value ?? ""));
                  setQuery("");
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      )}

      {error && (
        <p className="mt-1 text-sm font-medium text-red-600">{error}</p>
      )}
    </div>
  );
}

function RegisterUserForm({
  rolePreset,
  registerEndpoint = "/auth/register",
  token,
  onSaved,
  onError,
}) {
  const [values, setValues] = useState(getInitialRegistrationValues(rolePreset));
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);

  const role = rolePreset || values.role;

  const academicYearOptions = useMemo(() => {
    const years = [
      ...new Set(classes.map((classItem) => classItem.academicYear).filter(Boolean)),
    ];

    if (years.length > 0) return years.sort();

    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1].map(String);
  }, [classes]);

  useEffect(() => {
    const loadRoleOptions = async () => {
      if (!token) return;
      if (role !== "teacher" && role !== "student" && role !== "parent") return;

      try {
        if (role === "teacher") {
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

        if (role === "parent") {
          const studentsRes = await api.get("/student-profiles", {
            headers: { Authorization: `Bearer ${token}` },
          });
          setStudents(Array.isArray(studentsRes.data) ? studentsRes.data : []);
          return;
        }

        const classesRes = await api.get("/classes", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setClasses(classesRes.data || []);
      } catch (loadError) {
        onError(
          loadError.response?.data?.message || "Failed to load form options"
        );
      }
    };

    loadRoleOptions();
  }, [role, token, onError]);

  const updateValue = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }));

    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  const updateClassName = (classId) => {
    const selectedClass = findClassById(classes, classId);
    if (!selectedClass) return;

    setValues((current) => ({
      ...current,
      className: selectedClass.className,
      academicYear: selectedClass.academicYear || current.academicYear,
    }));
  };

  const submitForm = async (event) => {
    event.preventDefault();

    const errors = validateRegistrationForm(values, role);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      onError("Please fix the highlighted fields and try again.");
      return;
    }

    try {
      setSaving(true);
      onError("");
      setFieldErrors({});

      const payload =
        role === "admin"
          ? {
              fullName: values.fullName.trim(),
              email: values.email.trim(),
              phoneNumber: values.phoneNumber.trim(),
              password: values.password,
              confirmPassword: values.confirmPassword,
              status: values.status,
            }
          : {
              ...values,
              fullName: values.fullName.trim(),
              email: values.email.trim(),
              phoneNumber: values.phoneNumber.trim(),
              role,
            };

      const res = await api.post(registerEndpoint, payload, {
        headers: { Authorization: `Bearer ${token}` },
        skipToast: true,
      });

      toastSuccess(
        buildRegistrationSuccessMessage(
          res.data?.message || "User registered successfully.",
          role,
          res.data
        )
      );
      onSaved();
      setValues(getInitialRegistrationValues(rolePreset));
      setFieldErrors({});
    } catch (saveError) {
      const message =
        saveError.response?.data?.message ||
        saveError.message ||
        "User registration failed";

      if (message.toLowerCase().includes("email")) {
        setFieldErrors((current) => ({
          ...current,
          email: message,
        }));
      }

      onError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={submitForm}
      className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="mb-5 border-b border-slate-100 pb-4">
        <h2 className="typo-card text-slate-950">Register User</h2>
        <p className="mt-1 text-sm text-slate-600">
          Create a secure account and assign role-specific academic details.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormTextField
          label="Full Name"
          name="fullName"
          value={values.fullName}
          onChange={updateValue}
          required
          error={fieldErrors.fullName}
        />
        <FormTextField
          label="Email"
          name="email"
          type="email"
          value={values.email}
          onChange={updateValue}
          required
          error={fieldErrors.email}
        />
        <FormTextField
          label="Phone Number"
          name="phoneNumber"
          value={values.phoneNumber}
          onChange={updateValue}
          placeholder="e.g. 0771234567"
          required
          error={fieldErrors.phoneNumber}
        />
        <PasswordField
          label="Temporary Password"
          name="password"
          value={values.password}
          onChange={updateValue}
          required
          error={fieldErrors.password}
          showStrength
        />
        <PasswordField
          label="Confirm Password"
          name="confirmPassword"
          value={values.confirmPassword}
          onChange={updateValue}
          required
          error={fieldErrors.confirmPassword}
        />

        {!rolePreset && (
          <SelectField
            label="Role"
            name="role"
            value={values.role}
            onChange={updateValue}
            options={["teacher", "student", "parent"]}
          />
        )}

        {rolePreset && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 typo-ui text-slate-700">
            Role: {rolePreset}
          </div>
        )}

        <SelectField
          label="Status"
          name="status"
          value={values.status}
          onChange={updateValue}
          options={["Active", "Inactive"]}
        />

        {role === "teacher" && (
          <>
            <AutoIdNotice label="Teacher ID" />
            <OptionSelectField
              label="Assigned Subject Code"
              name="assignedSubject"
              value={values.assignedSubject}
              onChange={updateValue}
              placeholder="Select subject"
              error={fieldErrors.assignedSubject}
              options={subjects.map((subject) => ({
                value: subject.subjectCode,
                label: `${subject.subjectCode} - ${subject.subjectName}`,
              }))}
            />
            <OptionSelectField
              label="Assigned Class Name"
              name="assignedClass"
              value={values.assignedClass}
              onChange={updateValue}
              placeholder="Select class"
              error={fieldErrors.assignedClass}
              options={toClassNameSelectOptions(classes)}
            />
          </>
        )}

        {role === "student" && (
          <>
            <div className="md:col-span-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 typo-ui text-sky-900">
              Stream: <strong>Commerce Risk Assessment</strong> — core subjects
              Accounting, Business Studies, Economics
            </div>
            <AutoIdNotice label="Student ID" />
            <OptionSelectField
              label="Class Name"
              name="className"
              value={findClassIdForValues(
                classes,
                values.className,
                values.academicYear
              )}
              onChange={(_, value) => updateClassName(value)}
              placeholder="Select class (e.g. 12 Commerce A)"
              options={toClassIdSelectOptions(classes)}
            />
            <OptionSelectField
              label="Academic Year"
              name="academicYear"
              value={values.academicYear}
              onChange={updateValue}
              placeholder="Select academic year"
              options={academicYearOptions.map((year) => ({
                value: year,
                label: year,
              }))}
            />
          </>
        )}

        {role === "parent" && (
          <>
            <AutoIdNotice label="Parent ID" />
            <div className="md:col-span-2">
              <SearchableStudentSelect
                label="Link to Student"
                required
                students={students}
                value={values.childStudent}
                onChange={(studentProfileId) =>
                  updateValue("childStudent", studentProfileId)
                }
                error={fieldErrors.childStudent}
              />
            </div>
            <OptionSelectField
              label="Relationship *"
              name="relationship"
              value={values.relationship}
              onChange={updateValue}
              placeholder="Select relationship"
              options={[
                { value: "Mother", label: "Mother" },
                { value: "Father", label: "Father" },
                { value: "Guardian", label: "Guardian" },
              ]}
            />
            {fieldErrors.relationship ? (
              <p className="text-sm font-medium text-red-600">
                {fieldErrors.relationship}
              </p>
            ) : null}
          </>
        )}
      </div>

      <button
        type="submit"
        disabled={saving}
        className="mt-5 rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {saving
          ? getCreatingLabel(role)
          : role === "admin"
          ? "Create Admin Account"
          : "Create Account"}
      </button>
    </form>
  );
}

function getFeatureFormInitialValues(fields) {
  return Object.fromEntries(
    fields.map((field) => {
      if (field.defaultValue !== undefined) {
        return [field.name, field.defaultValue];
      }

      // Dependent / filtered selects should start empty until the parent is chosen.
      if (field.dependsOn || field.filterOptionsBy) {
        return [field.name, ""];
      }

      if (field.type === "select" && field.options?.length) {
        const first = field.options[0];
        return [field.name, typeof first === "object" ? first.value : first];
      }

      if (field.type === "date") {
        return [field.name, new Date().toISOString().slice(0, 10)];
      }

      return [field.name, ""];
    })
  );
}

function resolveAsyncOptionItems(field, asyncOptions) {
  const raw = asyncOptions[field.optionsEndpoint];

  if (field.optionsPath) {
    const nested = raw?.[field.optionsPath];
    return Array.isArray(nested) ? nested : [];
  }

  if (Array.isArray(raw)) return raw;
  return normalizeData(raw);
}

function getFieldSelectOptions(field, values, asyncOptions) {
  if (field.type === "async-select" || field.type === "searchable-async-select") {
    const rawItems = resolveAsyncOptionItems(field, asyncOptions);
    const items =
      field.optionsEndpoint === "/classes" && !field.skipDedupe
        ? dedupeClasses(rawItems)
        : rawItems;
    const filtered = field.filterBy
      ? items.filter((item) => field.filterBy(item, values, asyncOptions))
      : items;

    const options = filtered.map((item) => {
      if (typeof item === "string" || typeof item === "number") {
        return {
          value: String(item),
          label: String(item),
          searchText: String(item),
        };
      }

      return {
        value: String(item[field.optionValue] || item._id || ""),
        label: field.getOptionLabel
          ? field.getOptionLabel(item)
          : String(item[field.optionValue] || item._id || ""),
        searchText: [
          item.teacherId,
          item.studentId,
          item.fullName,
          item.email,
          item.subjectName,
          item.subjectCode,
          item.className,
          item.label,
          item.value,
        ]
          .filter(Boolean)
          .join(" "),
      };
    });

    if (field.allowEmpty) {
      return [
        { value: "", label: field.emptyLabel || "Not assigned" },
        ...options,
      ];
    }

    return options;
  }

  if (!field.options) return [];

  let options = field.options.map((option) =>
    typeof option === "object"
      ? option
      : { value: option, label: option }
  );

  if (field.filterOptionsBy) {
    options = options.filter((option) =>
      field.filterOptionsBy(option, values, asyncOptions)
    );
  }

  // Keep a legacy/custom selected value visible even if it is outside the catalog.
  const selectedValue = values?.[field.name];
  if (
    selectedValue &&
    !options.some((option) => String(option.value) === String(selectedValue))
  ) {
    options = [
      { value: String(selectedValue), label: String(selectedValue) },
      ...options,
    ];
  }

  return options;
}

function resolveRecordFieldValue(record, fieldName) {
  const raw = record?.[fieldName];
  if (raw === undefined || raw === null) return "";
  if (typeof raw === "object") {
    return String(raw._id || raw.id || "");
  }
  return String(raw);
}

function getNestedRecordValue(record, path) {
  if (!path) return undefined;
  return path.split(".").reduce((value, key) => value?.[key], record);
}

function formatHydratedFormValue(raw, fieldType) {
  if (raw === undefined || raw === null || raw === "") return "";

  if (fieldType === "date") {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  }

  if (typeof raw === "object") {
    return String(raw._id || raw.id || "");
  }

  return String(raw);
}

function FeatureForm({ form, token, onSaved, onError }) {
  const initialValues = getFeatureFormInitialValues(form.fields);

  const [values, setValues] = useState(initialValues);
  const [asyncOptions, setAsyncOptions] = useState({});
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const asyncOptionsRef = useRef(asyncOptions);

  useEffect(() => {
    asyncOptionsRef.current = asyncOptions;
  }, [asyncOptions]);

  useEffect(() => {
    const loadExistingValues = async () => {
      if (!form.loadEndpoint || !token) return;

      try {
        setLoadingOptions(true);
        const res = await api.get(form.loadEndpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const record = res.data?.settings || res.data || {};
        const nextValues = { ...getFeatureFormInitialValues(form.fields) };

        form.fields.forEach((field) => {
          if (record[field.name] !== undefined && record[field.name] !== null) {
            nextValues[field.name] = record[field.name];
          }
        });

        setValues(nextValues);
      } catch (loadError) {
        onError(
          loadError.response?.data?.message ||
            loadError.message ||
            "Failed to load current settings"
        );
      } finally {
        setLoadingOptions(false);
      }
    };

    loadExistingValues();
  }, [form, token, onError]);

  useEffect(() => {
    const loadAsyncOptions = async () => {
      const endpoints = [
        ...new Set(
          [
            ...(form.extraOptionEndpoints || []),
            ...form.fields
              .filter(
                (field) =>
                  (field.type === "async-select" ||
                    field.type === "searchable-async-select") &&
                  field.optionsEndpoint
              )
              .map((field) => field.optionsEndpoint),
          ].filter(Boolean)
        ),
      ];

      if (!endpoints.length || !token) return;

      try {
        setLoadingOptions(true);

        const nextOptions = {};
        await Promise.all(
          endpoints.map(async (endpoint) => {
            try {
              const response = await api.get(endpoint, {
                headers: { Authorization: `Bearer ${token}` },
              });
              // Keep raw payload so fields can use optionsPath (e.g. catalog.classNames).
              nextOptions[endpoint] = response.data;
            } catch (endpointError) {
              // One failed options endpoint must not blank every other dropdown.
              console.warn(
                `Failed to load form options from ${endpoint}:`,
                endpointError.response?.data?.message || endpointError.message
              );
              nextOptions[endpoint] = [];
            }
          })
        );

        setAsyncOptions(nextOptions);
      } catch (loadError) {
        onError(
          loadError.response?.data?.message ||
            loadError.message ||
            "Failed to load form options"
        );
      } finally {
        setLoadingOptions(false);
      }
    };

    loadAsyncOptions();
  }, [form.fields, form.extraOptionEndpoints, token, onError]);

  const reloadDependentOptions = async (nextValues, parentFieldName) => {
    const dependentFields = form.fields.filter(
      (field) =>
        field.dependsOn === parentFieldName &&
        typeof field.getOptionsQuery === "function" &&
        field.optionsEndpoint
    );

    if (!dependentFields.length || !token) return;

    try {
      setLoadingOptions(true);

      const updates = {};
      await Promise.all(
        dependentFields.map(async (field) => {
          const query = field.getOptionsQuery(
            nextValues,
            asyncOptionsRef.current
          );
          if (!query) {
            updates[field.optionsEndpoint] = [];
            return;
          }

          try {
            const response = await api.get(field.optionsEndpoint, {
              headers: { Authorization: `Bearer ${token}` },
              params: query,
            });
            updates[field.optionsEndpoint] = response.data;
          } catch (endpointError) {
            console.warn(
              `Failed to reload options from ${field.optionsEndpoint}:`,
              endpointError.response?.data?.message || endpointError.message
            );
            updates[field.optionsEndpoint] = [];
          }
        })
      );

      setAsyncOptions((current) => ({ ...current, ...updates }));
    } finally {
      setLoadingOptions(false);
    }
  };

  const updateFieldValue = (fieldName, nextValue) => {
    setValues((current) => {
      const next = { ...current, [fieldName]: nextValue };

      // When parent dropdown changes, clear dependent child fields.
      form.fields.forEach((field) => {
        if (field.dependsOn === fieldName) {
          next[field.name] = "";
        }
      });

      // Keep paired catalog fields in sync (e.g. subjectName ↔ subjectCode).
      const changedField = form.fields.find((field) => field.name === fieldName);
      if (changedField?.syncPair?.field && changedField?.syncPair?.valueKey) {
        const catalogItems = resolveAsyncOptionItems(changedField, asyncOptions);
        const selectedOption = catalogItems.find((item) => {
          if (typeof item === "string" || typeof item === "number") {
            return String(item) === String(nextValue);
          }
          return (
            String(item[changedField.optionValue] || item._id || "") ===
            String(nextValue)
          );
        });

        next[changedField.syncPair.field] = selectedOption
          ? String(
              typeof selectedOption === "object"
                ? selectedOption[changedField.syncPair.valueKey] || ""
                : selectedOption
            )
          : "";
      }

      // Hydrate related fields from a selected source record (e.g. link timetable → exam).
      if (changedField?.hydrateMap && typeof changedField.hydrateMap === "object") {
        const records = resolveAsyncOptionItems(changedField, asyncOptions);
        const selected = records.find((item) => {
          if (typeof item === "string" || typeof item === "number") {
            return String(item) === String(nextValue);
          }
          return (
            String(item[changedField.optionValue] || item._id || "") ===
            String(nextValue)
          );
        });

        Object.entries(changedField.hydrateMap).forEach(([targetField, path]) => {
          const targetConfig = form.fields.find((field) => field.name === targetField);
          next[targetField] = selected
            ? formatHydratedFormValue(
                getNestedRecordValue(selected, path),
                targetConfig?.type
              )
            : "";
        });
      }

      // When the edit-target record is selected, hydrate the rest of the form.
      if (form.idField && fieldName === form.idField) {
        const idFieldConfig = form.fields.find(
          (field) => field.name === form.idField
        );
        const records = resolveAsyncOptionItems(idFieldConfig || {}, asyncOptions);
        const selected = records.find(
          (item) => String(item._id) === String(nextValue)
        );

        if (selected) {
          form.fields.forEach((field) => {
            if (field.name === form.idField || field.omitFromPayload) return;
            next[field.name] = resolveRecordFieldValue(selected, field.name);
          });
        }
      }

      return next;
    });

    // After parent changes, reload dependent option lists (e.g. students for exam class).
    const nextValues = { ...values, [fieldName]: nextValue };
    form.fields.forEach((field) => {
      if (field.dependsOn === fieldName) {
        nextValues[field.name] = "";
      }
    });
    reloadDependentOptions(nextValues, fieldName);
  };

  const submitForm = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      onError("");

      const payload = {};

      form.fields.forEach((field) => {
        if (field.omitFromPayload) return;

        const value = values[field.name];

        if (field.transform === "csv") {
          payload[field.name] = value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
          return;
        }

        if (field.type === "number") {
          if (value === "" || value === null || value === undefined) {
            if (field.defaultValue !== undefined) {
              payload[field.name] = Number(field.defaultValue);
            }
            return;
          }

          payload[field.name] = Number(value);
          return;
        }

        if (field.name === "gradeLevel") {
          payload[field.name] = Number(value);
          return;
        }

        payload[field.name] = value;
      });

      const baseEndpoint = form.endpoint.replace(/\/$/, "");
      const requestUrl =
        form.idField && values[form.idField]
          ? `${baseEndpoint}/${values[form.idField]}`
          : baseEndpoint;

      if (form.idField && !values[form.idField]) {
        onError(`Select a record for ${form.idField} before saving.`);
        return;
      }

      const res = await api.request({
        url: requestUrl,
        method: form.method,
        data: form.method?.toLowerCase() === "delete" ? undefined : payload,
        headers: { Authorization: `Bearer ${token}` },
      });

      onSaved();

      if (form.loadEndpoint) {
        const record = res.data?.settings || res.data || payload;
        const nextValues = { ...getFeatureFormInitialValues(form.fields) };
        form.fields.forEach((field) => {
          if (record[field.name] !== undefined && record[field.name] !== null) {
            nextValues[field.name] = record[field.name];
          }
        });
        setValues(nextValues);
      } else {
        setValues(getFeatureFormInitialValues(form.fields));
      }
    } catch {
      // API errors are toasted by the shared axios interceptor.
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={submitForm}
      className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="mb-5 border-b border-slate-100 pb-4">
        <h2 className="typo-card text-slate-950">
          {form.formTitle || "Create Record"}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {loadingOptions
            ? "Loading form data..."
            : form.formDescription ||
              "Fill the required details and save the new record."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {form.fields.map((field) => {
          const selectOptions = getFieldSelectOptions(field, values, asyncOptions);
          const isSelect =
            field.type === "select" || field.type === "async-select";
          const dependsOnMissing =
            field.dependsOn && !values[field.dependsOn];
          const dependsOnLabel =
            form.fields.find((item) => item.name === field.dependsOn)?.label ||
            field.dependsOn;

          if (field.type === "searchable-async-select") {
            return (
              <div key={field.name} className="md:col-span-2">
                <SearchableOptionSelect
                  label={field.label}
                  required={field.required}
                  value={values[field.name]}
                  options={selectOptions}
                  placeholder={field.placeholder || "Search and select"}
                  disabled={dependsOnMissing || loadingOptions}
                  onChange={(nextValue) =>
                    updateFieldValue(field.name, nextValue)
                  }
                />
              </div>
            );
          }

          return (
            <label key={field.name} className="typo-label text-slate-700">
              {field.label}
              {field.required && <span className="text-red-600"> *</span>}

              {isSelect ? (
                <select
                  value={values[field.name]}
                  required={field.required}
                  disabled={dependsOnMissing || loadingOptions}
                  onChange={(event) =>
                    updateFieldValue(field.name, event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm disabled:bg-slate-100"
                >
                  <option value="">
                    {dependsOnMissing
                      ? `Select ${dependsOnLabel} first`
                      : !loadingOptions && selectOptions.length === 0
                        ? field.emptyOptionsMessage || "No options available"
                        : field.placeholder || "Select option"}
                  </option>
                  {selectOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  value={values[field.name]}
                  required={field.required}
                  placeholder={field.placeholder}
                  onChange={(event) =>
                    updateFieldValue(field.name, event.target.value)
                  }
                  className="mt-1 min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm"
                />
              ) : (
                <input
                  type={field.type || "text"}
                  value={values[field.name]}
                  required={field.required}
                  placeholder={field.placeholder}
                  onChange={(event) =>
                    updateFieldValue(field.name, event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm"
                />
              )}
            </label>
          );
        })}
      </div>

      <button
        type="submit"
        disabled={saving || loadingOptions}
        className="mt-5 rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {saving ? "Saving..." : form.submitLabel}
      </button>
    </form>
  );
}

function FormTextField({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder = "",
  error = "",
}) {
  return (
    <label className="typo-label text-slate-700">
      {label}
      {required && <span className="text-red-600"> *</span>}
      <input
        type={type}
        name={name}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(name, event.target.value)}
        className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm shadow-sm ${
          error ? "border-red-400" : "border-slate-300"
        }`}
      />
      {error && <p className="mt-1 typo-caption font-semibold text-red-600">{error}</p>}
    </label>
  );
}

function PasswordField({
  label,
  name,
  value,
  onChange,
  required = false,
  error = "",
  showStrength = false,
}) {
  const [visible, setVisible] = useState(false);
  const strength = getPasswordStrength(value);

  const strengthClass =
    strength.tone === "strong"
      ? "text-green-700"
      : strength.tone === "good"
      ? "text-blue-700"
      : strength.tone === "fair"
      ? "text-amber-700"
      : strength.tone === "weak"
      ? "text-red-600"
      : "text-slate-500";

  return (
    <label className="typo-label text-slate-700">
      {label}
      {required && <span className="text-red-600"> *</span>}
      <div className="relative mt-1">
        <input
          type={visible ? "text" : "password"}
          name={name}
          value={value}
          onChange={(event) => onChange(name, event.target.value)}
          className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm shadow-sm ${
            error ? "border-red-400" : "border-slate-300"
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-800"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>

      {error && <p className="mt-1 typo-caption font-semibold text-red-600">{error}</p>}

      {showStrength && value && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <p className={`font-semibold ${strengthClass}`}>
            Password strength: {strength.label || "Enter password"}
          </p>
          <ul className="mt-2 space-y-1">
            <li className={strength.checks.minLength ? "text-green-700" : ""}>
              {strength.checks.minLength ? "✓" : "•"} At least 8 characters
            </li>
            <li className={strength.checks.uppercase ? "text-green-700" : ""}>
              {strength.checks.uppercase ? "✓" : "•"} One uppercase letter
            </li>
            <li className={strength.checks.lowercase ? "text-green-700" : ""}>
              {strength.checks.lowercase ? "✓" : "•"} One lowercase letter
            </li>
            <li className={strength.checks.number ? "text-green-700" : ""}>
              {strength.checks.number ? "✓" : "•"} One number
            </li>
          </ul>
        </div>
      )}
    </label>
  );
}

function OptionSelectField({
  label,
  name,
  value,
  onChange,
  options,
  placeholder = "Select option",
  error,
}) {
  return (
    <label className="typo-label text-slate-700">
      {label}
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm ${
          error ? "border-red-400" : "border-slate-300"
        }`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="mt-1 text-sm font-medium text-red-600">{error}</p>
      ) : null}
    </label>
  );
}

function SelectField({ label, name, value, onChange, options }) {
  return (
    <label className="typo-label text-slate-700">
      {label}
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function DataTable({
  data,
  rows,
  rowAction,
  tableColumns,
  currentUserId,
  currentUserTeacherId,
  token,
  emptyMessage,
  emptyIcon,
  onSaved,
  onError,
}) {
  const [actionUserId, setActionUserId] = useState(null);
  const [studentsModal, setStudentsModal] = useState(null);
  const columns = tableColumns || getColumns(rows);
  const {
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    pageRows,
    totalItems,
    totalPages,
    pageSize,
  } = useClientTable(rows, { columns });

  if (!data) return <EmptyState icon={emptyIcon} message={emptyMessage} />;

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        message={emptyMessage || "No records found."}
      />
    );
  }

  const disableUser = async (row) => {
    const userId = row._id || row.id;

    if (userId === currentUserId) {
      onError("You cannot disable your own account.");
      return;
    }

    const confirmed = window.confirm(
      `Disable ${row.fullName || row.email}? This user will not be able to log in.`
    );

    if (!confirmed) return;

    try {
      setActionUserId(userId);
      onError("");

      await api.put(
        `/users/${userId}/disable`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      onSaved();
    } catch {
      // API errors are toasted by the shared axios interceptor.
    } finally {
      setActionUserId(null);
    }
  };

  const enableUser = async (row) => {
    const userId = row._id || row.id;

    const confirmed = window.confirm(
      `Enable ${row.fullName || row.email}? This user will be able to log in again.`
    );

    if (!confirmed) return;

    try {
      setActionUserId(userId);
      onError("");

      await api.put(
        `/users/${userId}`,
        { status: "Active" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      onSaved();
    } catch {
      // API errors are toasted by the shared axios interceptor.
    } finally {
      setActionUserId(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="block w-full max-w-md">
          <span className="sr-only">Search records</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search this table..."
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-blue-600/30 transition placeholder:text-slate-400 focus:border-blue-500 focus:ring"
          />
        </label>
        <p className="text-xs font-medium text-slate-500">
          {totalItems} match{totalItems === 1 ? "" : "es"}
        </p>
      </div>

      {totalItems === 0 ? (
        <div className="px-4 py-10 text-center text-sm font-medium text-slate-500">
          No records match your search.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column}
                    className="whitespace-nowrap p-3 font-semibold"
                  >
                    {formatLabel(column)}
                  </th>
                ))}
                {rowAction && (
                  <th className="whitespace-nowrap p-3 font-semibold">Action</th>
                )}
              </tr>
            </thead>

            <tbody>
              {pageRows.map((row, index) => (
                <tr
                  key={row._id || row.id || index}
                  className="border-t border-slate-200 bg-white"
                >
                  {columns.map((column) => (
                    <td
                      key={column}
                      className="max-w-sm p-3 align-top text-slate-700"
                    >
                      {column === "students" ? (
                        <StudentsSummaryCell
                          students={(Array.isArray(row[column])
                            ? row[column]
                            : []
                          ).filter((student) =>
                            isDisplayableClassStudent(student, {
                              currentUserId,
                              currentUserTeacherId,
                              assignedTeacherId:
                                row.assignedTeacher?._id ||
                                row.assignedTeacher,
                            })
                          )}
                          onView={() =>
                            setStudentsModal({
                              className: row.className || "Class",
                              academicYear: row.academicYear || "",
                              students: (Array.isArray(row[column])
                                ? row[column]
                                : []
                              ).filter((student) =>
                                isDisplayableClassStudent(student, {
                                  currentUserId,
                                  currentUserTeacherId,
                                  assignedTeacherId:
                                    row.assignedTeacher?._id ||
                                    row.assignedTeacher,
                                })
                              ),
                            })
                          }
                        />
                      ) : (
                        formatCellValue(column, row[column])
                      )}
                    </td>
                  ))}

                  {rowAction === "disableUser" && (
                    <td className="p-3 align-top">
                      {row.isActive ? (
                        <button
                          type="button"
                          disabled={
                            actionUserId === (row._id || row.id) ||
                            (row._id || row.id) === currentUserId
                          }
                          onClick={() => disableUser(row)}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:bg-slate-300"
                        >
                          {actionUserId === (row._id || row.id)
                            ? "Disabling..."
                            : (row._id || row.id) === currentUserId
                              ? "Current User"
                              : "Disable"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={actionUserId === (row._id || row.id)}
                          onClick={() => enableUser(row)}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:bg-slate-300"
                        >
                          {actionUserId === (row._id || row.id)
                            ? "Enabling..."
                            : "Enable"}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
      />

      {studentsModal ? (
        <ClassStudentsModal
          className={studentsModal.className}
          academicYear={studentsModal.academicYear}
          students={studentsModal.students}
          onClose={() => setStudentsModal(null)}
        />
      ) : null}
    </div>
  );
}

function getStudentDisplayName(student) {
  if (!student) return "Student";
  if (typeof student === "string") return student;
  return (
    student.fullName ||
    student.user?.fullName ||
    student.email ||
    "Student"
  );
}

function getStudentDisplayId(student) {
  if (!student || typeof student !== "object") return "No ID";
  return student.studentId || student.user?.studentId || "No ID";
}

function isDisplayableClassStudent(
  student,
  { currentUserId, currentUserTeacherId, assignedTeacherId } = {}
) {
  if (!student || typeof student !== "object") return false;

  const userKey = String(student._id || student.id || "");
  const role = String(student.role || "").toLowerCase();
  const studentCode = String(
    student.studentId || student.user?.studentId || ""
  )
    .trim()
    .toLowerCase();
  const teacherCode = String(currentUserTeacherId || "")
    .trim()
    .toLowerCase();

  if (role && role !== "student") return false;
  if (currentUserId && userKey && userKey === String(currentUserId)) {
    return false;
  }
  if (
    assignedTeacherId &&
    userKey &&
    userKey === String(assignedTeacherId)
  ) {
    return false;
  }
  // Hide the logged-in teacher's own ID if it was stored as a "student".
  if (teacherCode && studentCode && studentCode === teacherCode) {
    return false;
  }

  return true;
}

function StudentsSummaryCell({ students, onView }) {
  const list = Array.isArray(students) ? students : [];
  if (list.length === 0) {
    return <span className="text-slate-500">No students</span>;
  }

  const countLabel =
    list.length === 1 ? "1 student" : `${list.length} students`;

  return (
    <button
      type="button"
      onClick={onView}
      className="text-left text-sm font-semibold text-blue-700 transition hover:text-blue-900 hover:underline"
    >
      {countLabel} — View Students
    </button>
  );
}

function ClassStudentsModal({ className, academicYear, students, onClose }) {
  const title = academicYear ? `${className} (${academicYear})` : className;
  const sorted = [...(students || [])].sort((a, b) =>
    getStudentDisplayName(a).localeCompare(getStudentDisplayName(b))
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="class-students-modal-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="class-students-modal-title"
              className="typo-card text-slate-950"
            >
              Students
            </h2>
            <p className="mt-1 text-sm text-slate-600">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        {sorted.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No students assigned to this class.
          </p>
        ) : (
          <div className="mt-4 max-h-80 overflow-y-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-3 font-semibold">Student ID</th>
                  <th className="p-3 font-semibold">Name</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((student, index) => (
                  <tr
                    key={student._id || student.id || index}
                    className="border-t border-slate-200"
                  >
                    <td className="p-3 font-medium text-slate-800">
                      {getStudentDisplayId(student)}
                    </td>
                    <td className="p-3 text-slate-700">
                      {getStudentDisplayName(student)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryPanel({ data, fields }) {
  if (!data || fields.length === 0) return <EmptyState />;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {fields.map((field) => {
        const rawValue = getValueByPath(data, field.path);
        const displayValue =
          rawValue === null || rawValue === undefined || rawValue === ""
            ? "N/A"
            : `${rawValue}${field.suffix || ""}`;

        return (
          <div
            key={field.label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="typo-eyebrow text-slate-400">
              {field.label}
            </p>
            <p className="typo-value mt-2 text-slate-950">
              {displayValue}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function GridCardPanel({
  rows,
  titleKey,
  descriptionKey,
  metaKey,
  emptyMessage,
  emptyIcon,
}) {
  if (!rows.length) {
    return (
      <EmptyState
        icon={emptyIcon}
        message={emptyMessage || "No records found."}
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((row, index) => (
        <div
          key={row._id || row.id || index}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
        >
          {metaKey && row[metaKey] && (
            <p className="mb-2 typo-value text-slate-700">{row[metaKey]}</p>
          )}
          <h3 className="typo-card text-slate-950">
            {formatCellValue(titleKey, row[titleKey])}
          </h3>
          {descriptionKey && row[descriptionKey] && (
            <p className="mt-2 typo-body text-slate-600">
              {formatCellValue(descriptionKey, row[descriptionKey])}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function CardPanel({ data }) {
  const rows = normalizeData(data);
  const first = rows[0];

  if (!first) return <EmptyState />;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Object.entries(first)
        .filter(([key]) => key !== "__v" && key !== "_id")
        .slice(0, 12)
        .map(([key, value]) => (
          <div
            key={key}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="typo-eyebrow text-slate-400">
              {formatLabel(key)}
            </p>
            <p className="typo-value mt-2 text-slate-950">
              {formatValue(value)}
            </p>
          </div>
        ))}
    </div>
  );
}

function EmptyState({ message = "No data available yet.", icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      {icon && <div className="mb-2 text-3xl">{icon}</div>}
      <p className="typo-ui text-slate-600">{message}</p>
    </div>
  );
}

function resolveEmptyMessage(config, data) {
  if (typeof config.emptyMessage === "function") {
    return config.emptyMessage(data);
  }

  return config.emptyMessage;
}

function getFeatureConfig(pathname, user) {
  if (featureConfigs[pathname]) return featureConfigs[pathname];

  if (pathname.endsWith("/notifications")) {
    return user?.role === "student"
      ? {
          title: "Notifications",
          description: "Your current learning status and latest academic alerts.",
          endpoint: "/student-dashboard",
          layout: "summary",
          summaryFields: [
            { label: "Risk Status", path: "riskStatus" },
            { label: "Attendance", path: "attendancePercentage", suffix: "%" },
            { label: "Current Z-Score", path: "currentZScore" },
            { label: "Latest Exam", path: "latestResult.exam.examName" },
            { label: "Latest Marks", path: "latestResult.marks" },
            { label: "Latest Grade", path: "latestResult.grade" },
          ],
        }
      : {
          title: "Notifications",
          endpoint: "/risk-notifications",
          description:
            user?.role === "parent"
              ? "Alerts when your linked child is at Medium or High academic risk."
              : "Latest risk alerts for students in your assigned classes.",
          tableColumns:
            user?.role === "parent"
              ? ["studentName", "className", "riskStatus", "message"]
              : [
                  "studentName",
                  "studentId",
                  "className",
                  "riskStatus",
                  "message",
                ],
          emptyMessage:
            user?.role === "parent"
              ? "No risk alerts right now. Notifications appear here when your child is assessed as Medium or High risk."
              : "No Medium or High risk students in your scope right now.",
        };
  }

  if (pathname.endsWith("/profile")) {
    return {
      title: "Profile",
      profileData: user,
      description: "Current logged-in account details.",
    };
  }

  return {
    title: "Dashboard Feature",
    description: "This section is ready for its own API integration.",
  };
}

function normalizeData(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];

  const arrayValue = Object.values(data).find((value) => Array.isArray(value));
  if (arrayValue) return arrayValue;

  return [data];
}

function getValueByPath(data, path) {
  if (!path) return data;
  return path.split(".").reduce((value, key) => value?.[key], data);
}

function getColumns(rows) {
  const priority = [
    "fullName",
    "email",
    "role",
    "className",
    "subjectName",
    "subjectCode",
    "examName",
    "studentName",
    "studentId",
    "marks",
    "grade",
    "rank",
    "zScore",
    "riskStatus",
    "attendancePercentage",
    "month",
    "averageMarks",
    "topic",
    "noteTitle",
    "question",
    "stream",
    "medium",
    "academicYear",
    "gradeLevel",
    "isActive",
    "createdAt",
  ];

  const hiddenKeys = new Set([
    "_id",
    "id",
    "__v",
    "password",
    "updatedAt",
    "user",
    "assignedTeacher",
    // Internal teacher assignment refs (ObjectIds) — not for generic tables.
    // Readable labels live on Add Teacher via /users/teachers.
    "assignedSubject",
    "assignedClass",
    "parent",
    "class",
    "subjects",
    "passwordResetToken",
    "passwordResetExpires",
  ]);

  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))].filter(
    (key) => !hiddenKeys.has(key)
  );

  return [
    ...priority.filter((key) => keys.includes(key)),
    ...keys.filter((key) => !priority.includes(key)),
  ].slice(0, 8);
}

function formatCellValue(column, value) {
  if (column === "role") {
    if (value === "superadmin") return "Super Admin";
    if (!value) return "N/A";
    return String(value).charAt(0).toUpperCase() + String(value).slice(1);
  }

  if (column === "student") {
    if (value && typeof value === "object") {
      return (
        value.user?.fullName ||
        value.fullName ||
        value.studentId ||
        "Student"
      );
    }
    const text = String(value || "");
    // Hide raw MongoDB ObjectIds from parent/teacher tables.
    if (/^[a-f0-9]{24}$/i.test(text)) return "Student";
    return text || "N/A";
  }

  if (column === "isActive") {
    return value ? "Active" : "Inactive";
  }

  if (column === "gradeLevel") {
    return value ? `Grade ${value}` : "N/A";
  }

  if (column === "rank") {
    const numericRank = Number(value);
    return numericRank > 0 ? numericRank : "N/A";
  }

  if (column === "marks" || column === "averageMarks" || column === "zScore") {
    if (value === null || value === undefined || value === "") return "N/A";
    return Number(value).toFixed(2);
  }

  if ((column === "examDate" || column === "createdAt" || column === "date") && value) {
    return new Date(value).toLocaleDateString("en-GB");
  }

  if (column === "keywords" && Array.isArray(value)) {
    return value.filter(Boolean).join(", ") || "N/A";
  }

  if (column === "assignedTeacher") {
    if (!value) return "Not assigned";
    if (typeof value === "object") {
      const id = value.teacherId || "";
      const name = value.fullName || "";
      if (id && name) return `${id} — ${name}`;
      return name || id || "Not assigned";
    }
    if (/^[a-f0-9]{24}$/i.test(String(value))) return "Not assigned";
    return String(value);
  }

  // Subject.classes can hold twin Class rows with the same className.
  if (column === "classes" && Array.isArray(value)) {
    const names = [];
    const seen = new Set();
    for (const item of value) {
      const name =
        typeof item === "string"
          ? item.trim()
          : String(item?.className || "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      names.push(name);
    }
    return names.join(", ") || "N/A";
  }

  if (column === "modelAnswer" && typeof value === "string") {
    return value.length > 80 ? `${value.slice(0, 80)}...` : value;
  }

  if (column === "students" && Array.isArray(value)) {
    if (value.length === 0) return "No students";
    const names = value
      .map((student) =>
        typeof student === "string"
          ? student
          : student?.fullName || student?.user?.fullName || student?.studentId
      )
      .filter(Boolean);
    return names.length ? names.join(", ") : `${value.length} student(s)`;
  }

  return formatValue(value);
}

function formatLabel(label) {
  return label
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "N/A";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);

  if (typeof value === "string") {
    return value.length > 120 ? `${value.slice(0, 120)}...` : value;
  }

  if (Array.isArray(value)) {
    return value.map(formatValue).join(", ") || "N/A";
  }

  return (
    value.fullName ||
    value.user?.fullName ||
    value.email ||
    value.subjectName ||
    value.className ||
    value.examName ||
    value.studentName ||
    value.studentId ||
    value.noteTitle ||
    value.question ||
    value.fileName ||
    value.message ||
    JSON.stringify(value)
  );
}

function downloadBlob(blob, fileName) {
  const fileURL = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = fileURL;
  link.setAttribute("download", fileName);

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(fileURL);
}

export default DashboardFeaturePage;