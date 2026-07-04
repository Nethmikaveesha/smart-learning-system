import cron from "node-cron";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

import StudentProfile from "../models/StudentProfile.js";
import Result from "../models/Result.js";

const reportsDirectory = path.join(
  process.cwd(),
  "generated-reports"
);

if (!fs.existsSync(reportsDirectory)) {
  fs.mkdirSync(reportsDirectory, {
    recursive: true,
  });
}

const generateMonthlyReportForStudent = async (
  student,
  results,
  monthLabel
) => {
  return new Promise((resolve, reject) => {
    try {
      const safeMonth = monthLabel.replace(/\s+/g, "-");

      const fileName =
        `${student.studentId}-${safeMonth}-progress-report.pdf`;

      const filePath = path.join(
        reportsDirectory,
        fileName
      );

      const doc = new PDFDocument({
        margin: 50,
      });

      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      doc
        .fontSize(20)
        .text("Smart Learning System", {
          align: "center",
        });

      doc.moveDown();

      doc
        .fontSize(16)
        .text("Monthly Student Progress Report", {
          align: "center",
        });

      doc.moveDown();

      doc
        .fontSize(12)
        .text(`Report Month: ${monthLabel}`);

      doc.text(
        `Student Name: ${
          student.user?.fullName || "N/A"
        }`
      );

      doc.text(`Student ID: ${student.studentId}`);

      doc.text(
        `Class: ${
          student.class?.className || "N/A"
        }`
      );

      doc.text(
        `Attendance: ${
          student.attendancePercentage ?? 0
        }%`
      );

      doc.text(
        `Risk Status: ${
          student.riskStatus || "N/A"
        }`
      );

      doc.text(
        `Current Z-Score: ${
          student.currentZScore ?? 0
        }`
      );

      doc.moveDown();

      doc
        .fontSize(14)
        .text("Monthly Exam Results");

      doc.moveDown();

      if (results.length === 0) {
        doc
          .fontSize(12)
          .text(
            "No examination results were recorded for this month."
          );
      } else {
        results.forEach((result, index) => {
          doc
            .fontSize(12)
            .text(
              `${index + 1}. ${
                result.exam?.examName || "Exam"
              } | Marks: ${result.marks} | Grade: ${
                result.grade
              } | Rank: ${
                result.rank
              } | Z-Score: ${
                result.zScore
              }`
            );
        });
      }

      doc.moveDown();

      if (results.length > 0) {
        const averageMarks =
          results.reduce(
            (sum, result) =>
              sum + Number(result.marks || 0),
            0
          ) / results.length;

        doc.text(
          `Monthly Average Marks: ${averageMarks.toFixed(
            2
          )}`
        );
      }

      doc.moveDown();

      doc.text(
        `Generated Date: ${new Date().toLocaleDateString(
          "en-GB"
        )}`
      );

      doc.end();

      stream.on("finish", () => {
        resolve({
          fileName,
          filePath,
        });
      });

      stream.on("error", reject);
    } catch (error) {
      reject(error);
    }
  });
};

export const runMonthlyReportGeneration = async () => {
  try {
    console.log(
      "Starting automatic monthly PDF report generation..."
    );

    const now = new Date();

    // Previous calendar month
    const startDate = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );

    const endDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    const monthLabel = startDate.toLocaleString(
      "en-US",
      {
        month: "long",
        year: "numeric",
      }
    );

    const students = await StudentProfile.find()
      .populate("user", "fullName email")
      .populate("class", "className");

    let generatedCount = 0;

    for (const student of students) {
      const results = await Result.find({
        student: student._id,
      })
        .populate("exam", "examName examDate")
        .sort({ createdAt: 1 });

      const monthlyResults = results.filter(
        (result) => {
          const resultDate = result.exam?.examDate
            ? new Date(result.exam.examDate)
            : new Date(result.createdAt);

          return (
            resultDate >= startDate &&
            resultDate < endDate
          );
        }
      );

      await generateMonthlyReportForStudent(
        student,
        monthlyResults,
        monthLabel
      );

      generatedCount += 1;
    }

    console.log(
      `Monthly reports completed. Generated: ${generatedCount}`
    );

    return {
      success: true,
      month: monthLabel,
      generatedCount,
    };
  } catch (error) {
    console.error(
      "Monthly Report Job Error:",
      error.message
    );

    throw error;
  }
};

export const startMonthlyReportScheduler = () => {
  // Runs at 01:00 on the 1st day of every month
  cron.schedule("0 1 1 * *", async () => {
    try {
      await runMonthlyReportGeneration();
    } catch (error) {
      console.error(
        "Scheduled Monthly Report Error:",
        error.message
      );
    }
  });

  console.log(
    "Monthly PDF report scheduler started"
  );
};