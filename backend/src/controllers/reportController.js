import PDFDocument from "pdfkit";
import StudentProfile from "../models/StudentProfile.js";
import Result from "../models/Result.js";
import { runMonthlyReportGeneration } from "../jobs/monthlyReportJob.js";

export const generateStudentReport = async (req, res) => {
  try {
    const parentId = req.user._id;

    const student = await StudentProfile.findOne({ parent: parentId })
      .populate("user", "fullName email")
      .populate("class", "className");

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
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
    console.error(
      "Monthly Report Test Error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Monthly PDF report generation failed",
      error: error.message,
    });
  }
};