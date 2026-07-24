import cron from "node-cron";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import User from "../models/User.js";
import StudentProfile from "../models/StudentProfile.js";
import Result from "../models/Result.js";
import Attendance from "../models/Attendance.js";
import Subject from "../models/Subject.js";
import Exam from "../models/Exam.js";
import Class from "../models/Class.js";
import SystemSettings from "../models/SystemSettings.js";
import ContactMessage from "../models/ContactMessage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Always write under backend/database-backups (stable regardless of cwd)
const backupDirectory = path.join(__dirname, "../../database-backups");

if (!fs.existsSync(backupDirectory)) {
  fs.mkdirSync(backupDirectory, {
    recursive: true,
  });
}

export const runDatabaseBackup = async () => {
  try {
    console.log("Starting database backup...");

    const [
      users,
      students,
      results,
      attendance,
      subjects,
      exams,
      classes,
      settings,
      contactMessages,
    ] = await Promise.all([
      User.find().lean(),
      StudentProfile.find().lean(),
      Result.find().lean(),
      Attendance.find().lean(),
      Subject.find().lean(),
      Exam.find().lean(),
      Class.find().lean(),
      SystemSettings.find().lean(),
      ContactMessage.find().lean(),
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
        totalClasses: classes.length,
        totalSettings: settings.length,
        totalContactMessages: contactMessages.length,
      },
      data: {
        users,
        students,
        results,
        attendance,
        subjects,
        exams,
        classes,
        settings,
        contactMessages,
      },
    };

    const timestamp = new Date()
      .toISOString()
      .replace(/:/g, "-")
      .replace(/\./g, "-");

    const fileName = `smart-learning-backup-${timestamp}.json`;
    const filePath = path.join(backupDirectory, fileName);

    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), "utf-8");

    console.log(`Database backup completed: ${fileName}`);

    return {
      success: true,
      fileName,
      filePath,
      createdAt: backupData.createdAt,
      metadata: backupData.metadata,
    };
  } catch (error) {
    console.error("Database Backup Job Error:", error.message);
    throw error;
  }
};

export const listDatabaseBackups = () => {
  if (!fs.existsSync(backupDirectory)) {
    return [];
  }

  return fs
    .readdirSync(backupDirectory)
    .filter((name) => name.endsWith(".json"))
    .map((fileName) => {
      const filePath = path.join(backupDirectory, fileName);
      const stats = fs.statSync(filePath);
      return {
        fileName,
        sizeBytes: stats.size,
        sizeKb: Number((stats.size / 1024).toFixed(1)),
        createdAt: stats.mtime.toISOString(),
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

export const getBackupDirectory = () => backupDirectory;

export const startDatabaseBackupScheduler = () => {
  // Every Sunday at 02:00
  cron.schedule("0 2 * * 0", async () => {
    try {
      await runDatabaseBackup();
    } catch (error) {
      console.error("Scheduled Database Backup Error:", error.message);
    }
  });

  console.log("Weekly database backup scheduler started");
};
