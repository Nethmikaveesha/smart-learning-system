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

/**
 * Restore a JSON backup created by runDatabaseBackup.
 * fileName must be a basename under backend/database-backups (no path traversal).
 */
export const restoreDatabaseBackup = async (fileName) => {
  const safeName = path.basename(String(fileName || ""));

  if (!safeName || safeName !== fileName || !safeName.endsWith(".json")) {
    throw new Error("Invalid backup file name");
  }

  const filePath = path.join(backupDirectory, safeName);

  if (!fs.existsSync(filePath)) {
    throw new Error("Backup file not found");
  }

  const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const data = parsed?.data;

  if (!data || typeof data !== "object") {
    throw new Error("Backup file is missing a data section");
  }

  // Restore order: parents first, then dependent collections.
  const steps = [
    { key: "users", model: User },
    { key: "classes", model: Class },
    { key: "subjects", model: Subject },
    { key: "students", model: StudentProfile },
    { key: "exams", model: Exam },
    { key: "results", model: Result },
    { key: "attendance", model: Attendance },
    { key: "settings", model: SystemSettings },
    { key: "contactMessages", model: ContactMessage },
  ];

  const restored = {};

  for (const step of steps) {
    const rows = Array.isArray(data[step.key]) ? data[step.key] : [];
    await step.model.deleteMany({});
    if (rows.length > 0) {
      await step.model.insertMany(rows, { ordered: false });
    }
    restored[step.key] = rows.length;
  }

  return {
    success: true,
    fileName: safeName,
    restored,
    createdAt: parsed.createdAt || null,
  };
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
