import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import StudentProfile from "../models/StudentProfile.js";
import Result from "../models/Result.js";
import {
  reportsDirectory,
  runMonthlyReportGeneration,
} from "../jobs/monthlyReportJob.js";
import { linkedStudentsQuery } from "../utils/parentLinks.js";
import {
  getTeacherScope,
  resolvePrimaryAssignedClassTwinIds,
  resolveSubjectTwinIds,
} from "../utils/teacherScope.js";
import { getPassMark, isPassingMark } from "../utils/grading.js";
import { getSubjectName } from "../utils/studentResults.js";

const SAFE_REPORT_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.pdf$/i;

function ensureReportsDirectory() {
  if (!fs.existsSync(reportsDirectory)) {
    fs.mkdirSync(reportsDirectory, { recursive: true });
  }
}

function resolveSafeReportPath(fileName) {
  const raw = String(fileName || "").trim();
  if (!SAFE_REPORT_FILE.test(raw)) {
    return null;
  }

  const resolvedDir = path.resolve(reportsDirectory);
  const resolvedFile = path.resolve(resolvedDir, raw);
  if (
    resolvedFile !== resolvedDir &&
    !resolvedFile.startsWith(resolvedDir + path.sep)
  ) {
    return null;
  }

  return resolvedFile;
}

function parseReportFileName(fileName) {
  // STU0001-August-2026-progress-report.pdf
  const base = String(fileName || "").replace(/\.pdf$/i, "");
  const match = base.match(/^(.+?)-(.+)-progress-report$/i);

  if (!match) {
    return {
      studentId: "",
      monthLabel: "",
    };
  }

  return {
    studentId: match[1],
    monthLabel: String(match[2] || "").replace(/-/g, " "),
  };
}

export const generateStudentReport = async (req, res) => {
  try {
    const parentId = req.user._id;
    const requestedStudentId = req.query.studentId;

    // Prefer the selected child; fall back to the first linked child.
    const query = linkedStudentsQuery(parentId);
    if (requestedStudentId) {
      query.studentId = requestedStudentId;
    }

    const student = await StudentProfile.findOne(query)
      .populate("user", "fullName email")
      .populate("class", "className");

    if (!student) {
      return res.status(404).json({
        message: requestedStudentId
          ? "Selected child not found for this parent"
          : "Student not found",
      });
    }

    const results = await Result.find({ student: student._id })
      .populate("exam", "examName examDate")
      .sort({ createdAt: -1 });

    const doc = new PDFDocument();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${student.studentId}-progress-report.pdf`
    );

    doc.pipe(res);

    doc.fontSize(20).text("Smart Learning System", { align: "center" });
    doc.moveDown();
    doc.fontSize(16).text("Student Progress Report", { align: "center" });
    doc.moveDown();

    doc.fontSize(12).text(`Student Name: ${student.user.fullName}`);
    doc.text(`Student ID: ${student.studentId}`);
    doc.text(`Class: ${student.class?.className || "N/A"}`);
    doc.text(`Attendance: ${student.attendancePercentage}%`);
    doc.text(`Risk Status: ${student.riskStatus}`);
    doc.text(`Current Z-Score: ${student.currentZScore}`);
    doc.moveDown();

    doc.fontSize(14).text("Exam Results");
    doc.moveDown();

    results.forEach((result, index) => {
      doc.fontSize(12).text(
        `${index + 1}. ${result.exam?.examName || "Exam"} | Marks: ${
          result.marks
        } | Grade: ${result.grade} | Rank: ${result.rank} | Z-Score: ${
          result.zScore
        }`
      );
    });

    doc.moveDown();
    doc.text(`Generated Date: ${new Date().toLocaleDateString()}`);

    doc.end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Teacher PDF: summary + student rows for the admin-assigned class only.
 */
export const generateTeacherClassReport = async (req, res) => {
  try {
    const scope = await getTeacherScope(req.user._id);
    const allowedClassIds = await resolvePrimaryAssignedClassTwinIds(scope);

    if (!allowedClassIds.length) {
      return res.status(400).json({
        message:
          "No class is assigned to your account yet. Ask an admin to assign your class before downloading a report.",
      });
    }

    const students = await StudentProfile.find({
      class: { $in: allowedClassIds },
    })
      .populate("user", "fullName email")
      .populate("class", "className academicYear gradeLevel")
      .sort({ studentId: 1 });

    const studentIds = students.map((student) => student._id);
    const resultFilter = { student: { $in: studentIds } };

    if (scope.subjectIds.length > 0) {
      const Exam = (await import("../models/Exam.js")).default;
      const twinSubjectIds = await resolveSubjectTwinIds(scope.subjectIds);
      const examIds = await Exam.find({
        subject: { $in: twinSubjectIds },
        class: { $in: allowedClassIds },
      }).distinct("_id");
      resultFilter.exam = { $in: examIds };
    }

    const results =
      studentIds.length > 0
        ? await Result.find(resultFilter)
            .populate({
              path: "exam",
              select: "examName examDate subject",
              populate: { path: "subject", select: "subjectName" },
            })
            .populate({
              path: "student",
              select: "studentId",
              populate: { path: "user", select: "fullName" },
            })
            .sort({ createdAt: -1 })
        : [];

    const passMark = await getPassMark();
    const totalResults = results.length;
    const averageMarks =
      totalResults > 0
        ? Number(
            (
              results.reduce((sum, row) => sum + Number(row.marks || 0), 0) /
              totalResults
            ).toFixed(2)
          )
        : 0;
    const passCount = results.filter((row) =>
      isPassingMark(row.marks, passMark)
    ).length;
    const failCount = totalResults - passCount;
    const highRiskStudents = students.filter(
      (student) => String(student.riskStatus || "").toLowerCase() === "high"
    ).length;
    const averageAttendance =
      students.length > 0
        ? Number(
            (
              students.reduce(
                (sum, student) =>
                  sum + Number(student.attendancePercentage || 0),
                0
              ) / students.length
            ).toFixed(2)
          )
        : 0;

    const classLabel =
      scope.adminAssignedClassLabels?.[0] ||
      students[0]?.class?.className ||
      "Assigned class";
    const subjectLabel =
      scope.adminAssignedSubjectLabels?.[0] ||
      scope.subjectLabels?.[0] ||
      "Assigned subject";
    const teacherName = scope.teacher?.fullName || req.user.fullName || "Teacher";
    const safeClass = String(classLabel)
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
    const fileName = `teacher-class-report-${safeClass || "class"}.pdf`;

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );
    doc.pipe(res);

    doc.fontSize(18).text("EduTrack | Smart Learning System", {
      align: "center",
    });
    doc.moveDown(0.4);
    doc.fontSize(14).text("Teacher Class Report", { align: "center" });
    doc.moveDown();

    doc.fontSize(11).text(`Teacher: ${teacherName}`);
    doc.text(`Assigned Class: ${classLabel}`);
    doc.text(`Assigned Subject: ${subjectLabel}`);
    doc.text(`Generated: ${new Date().toLocaleString("en-GB")}`);
    doc.moveDown();

    doc.fontSize(13).text("Summary");
    doc.moveDown(0.3);
    doc.fontSize(11).text(`Total Students: ${students.length}`);
    doc.text(`Average Marks: ${averageMarks}`);
    doc.text(`Pass Count: ${passCount}`);
    doc.text(`Fail Count: ${failCount}`);
    doc.text(`High Risk Students: ${highRiskStudents}`);
    doc.text(`Average Attendance: ${averageAttendance}%`);
    doc.moveDown();

    doc.fontSize(13).text("Students");
    doc.moveDown(0.4);

    if (students.length === 0) {
      doc.fontSize(11).text("No students found in the assigned class.");
    } else {
      students.forEach((student, index) => {
        const studentResults = results.filter(
          (row) => String(row.student?._id || row.student) === String(student._id)
        );
        const studentAvg =
          studentResults.length > 0
            ? (
                studentResults.reduce(
                  (sum, row) => sum + Number(row.marks || 0),
                  0
                ) / studentResults.length
              ).toFixed(2)
            : "N/A";

        doc
          .fontSize(11)
          .text(
            `${index + 1}. ${student.user?.fullName || "Student"} (${student.studentId || "No ID"})`
          );
        doc.text(
          `   Class: ${student.class?.className || "N/A"} | Attendance: ${Number(student.attendancePercentage || 0)}% | Risk: ${student.riskStatus || "N/A"} | Avg Marks: ${studentAvg}`
        );
        doc.moveDown(0.25);
      });
    }

    if (results.length > 0) {
      doc.moveDown(0.5);
      doc.fontSize(13).text("Recent Results");
      doc.moveDown(0.3);
      results.slice(0, 40).forEach((result, index) => {
        doc
          .fontSize(10)
          .text(
            `${index + 1}. ${result.student?.user?.fullName || result.student?.studentId || "Student"} | ${result.exam?.examName || "Exam"} (${getSubjectName(result) || subjectLabel}) | Marks: ${result.marks} | Grade: ${result.grade || "N/A"}`
          );
      });
      if (results.length > 40) {
        doc.moveDown(0.3);
        doc
          .fontSize(10)
          .text(`…and ${results.length - 40} more result row(s).`);
      }
    }

    doc.end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const testMonthlyReportGeneration = async (req, res) => {
  try {
    const result = await runMonthlyReportGeneration();

    return res.status(200).json({
      success: true,
      message: "Monthly PDF reports generated successfully",
      ...result,
    });
  } catch (error) {
    console.error("Monthly Report Test Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Monthly PDF report generation failed",
      error: error.message,
    });
  }
};

export const listGeneratedMonthlyReports = async (_req, res) => {
  try {
    ensureReportsDirectory();

    const files = fs
      .readdirSync(reportsDirectory)
      .filter((name) => SAFE_REPORT_FILE.test(name));

    const reports = files
      .map((fileName) => {
        const fullPath = path.join(reportsDirectory, fileName);
        const stats = fs.statSync(fullPath);
        const parsed = parseReportFileName(fileName);

        return {
          fileName,
          studentId: parsed.studentId || "N/A",
          monthLabel: parsed.monthLabel || "N/A",
          sizeKb: Math.max(1, Math.round(stats.size / 1024)),
          generatedAt: stats.mtime,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
      );

    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const downloadGeneratedMonthlyReport = async (req, res) => {
  try {
    ensureReportsDirectory();

    const safePath = resolveSafeReportPath(req.params.fileName);
    if (!safePath || !fs.existsSync(safePath)) {
      return res.status(404).json({ message: "Report file not found" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${path.basename(safePath)}"`
    );

    fs.createReadStream(safePath).pipe(res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
