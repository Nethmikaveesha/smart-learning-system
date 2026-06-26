import fs from "fs";
import path from "path";

import User from "../models/User.js";
import StudentProfile from "../models/StudentProfile.js";
import Result from "../models/Result.js";
import Attendance from "../models/Attendance.js";
import Subject from "../models/Subject.js";
import Exam from "../models/Exam.js";

export const createBackup = async (req, res) => {
  try {
    const backup = {
      createdAt: new Date(),

      users: await User.find(),

      students: await StudentProfile.find(),

      results: await Result.find(),

      attendance: await Attendance.find(),

      subjects: await Subject.find(),

      exams: await Exam.find(),
    };

    const backupFolder = path.join(process.cwd(), "backups");

    if (!fs.existsSync(backupFolder)) {
      fs.mkdirSync(backupFolder);
    }

    const filename = `backup-${Date.now()}.json`;

    const filepath = path.join(backupFolder, filename);

    fs.writeFileSync(
      filepath,
      JSON.stringify(backup, null, 2)
    );

    res.download(filepath);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};