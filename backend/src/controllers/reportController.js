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
