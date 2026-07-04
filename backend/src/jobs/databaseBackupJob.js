import cron from "node-cron";
import fs from "fs";
import path from "path";

import User from "../models/User.js";
import StudentProfile from "../models/StudentProfile.js";
import Result from "../models/Result.js";
import Attendance from "../models/Attendance.js";
import Subject from "../models/Subject.js";
import Exam from "../models/Exam.js";

const backupDirectory = path.join(
  process.cwd(),
  "database-backups"
);

if (!fs.existsSync(backupDirectory)) {
  fs.mkdirSync(backupDirectory, {
    recursive: true,
  });
}

export const runDatabaseBackup = async () => {
  try {
    console.log("Starting automatic database backup...");

    const [
      users,
      students,
      results,
      attendance,
      subjects,
      exams,
    ] = await Promise.all([
      User.find().lean(),
      StudentProfile.find().lean(),
      Result.find().lean(),
      Attendance.find().lean(),
      Subject.find().lean(),
      Exam.find().lean(),
    ]);

    const backupData = {
      createdAt: new Date().toISOString(),

      metadata: {
        totalUsers: users.length,
        totalStudents: students.length,
        totalResults: results.length,
        totalAttendanceRecords: attendance.length,
        totalSubjects: subjects.length,
        totalExams: exams.length,
      },

      data: {
        users,
        students,
        results,
        attendance,
        subjects,
        exams,
      },
    };

    const timestamp = new Date()
      .toISOString()
      .replace(/:/g, "-")
      .replace(/\./g, "-");

    const fileName = `smart-learning-backup-${timestamp}.json`;

    const filePath = path.join(
      backupDirectory,
      fileName
    );

    fs.writeFileSync(
      filePath,
      JSON.stringify(backupData, null, 2),
      "utf-8"
    );

    console.log(
      `Database backup completed: ${fileName}`
    );

    return {
      success: true,
      fileName,
      filePath,
      createdAt: backupData.createdAt,
      metadata: backupData.metadata,
    };
  } catch (error) {
    console.error(
      "Database Backup Job Error:",
      error.message
    );

    throw error;
  }
};

export const startDatabaseBackupScheduler = () => {
  // Every Sunday at 02:00
  cron.schedule("0 2 * * 0", async () => {
    try {
      await runDatabaseBackup();
    } catch (error) {
      console.error(
        "Scheduled Database Backup Error:",
        error.message
      );
    }
  });

  console.log(
    "Weekly database backup scheduler started"
  );
};