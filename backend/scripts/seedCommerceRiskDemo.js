/**
 * Seed Commerce Stream demo data:
 * - Classes: 12 Commerce A, 13 Commerce A
 * - Subjects: Accounting, Business Studies, Economics
 * - 3 students with Low / Medium / High risk profiles + marks/attendance
 * - Saved CommerceRisk predictions (for Teacher/Parent dashboards)
 *
 * Usage:
 *   cd backend
 *   node scripts/seedCommerceRiskDemo.js
 */
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import User from "../src/models/User.js";
import StudentProfile from "../src/models/StudentProfile.js";
import Subject from "../src/models/Subject.js";
import Class from "../src/models/Class.js";
import Exam from "../src/models/Exam.js";
import Result from "../src/models/Result.js";
import Attendance from "../src/models/Attendance.js";
import CommerceRisk from "../src/models/CommerceRisk.js";
import { calculateGrade } from "../src/utils/grading.js";

dotenv.config();

const YEAR = String(new Date().getFullYear());
const PASSWORD = "123456";

const STUDENTS = [
  {
    email: "low.risk@edutrack.test",
    fullName: "Low Risk Student",
    studentId: "COM-LOW-001",
    phoneNumber: "0771000001",
    riskStatus: "Low",
    riskLevel: "Low Risk",
    marks: { accounting: 82, business: 78, economics: 80 },
    attendanceRate: 0.92,
  },
  {
    email: "medium.risk@edutrack.test",
    fullName: "Medium Risk Student",
    studentId: "COM-MED-001",
    phoneNumber: "0771000002",
    riskStatus: "Medium",
    riskLevel: "Medium Risk",
    marks: { accounting: 58, business: 55, economics: 52 },
    attendanceRate: 0.72,
  },
  {
    email: "high.risk@edutrack.test",
    fullName: "High Risk Student",
    studentId: "COM-HIGH-001",
    phoneNumber: "0771000003",
    riskStatus: "High",
    riskLevel: "High Risk",
    marks: { accounting: 38, business: 42, economics: 35 },
    attendanceRate: 0.55,
  },
];

async function upsertClass({ className, gradeLevel }) {
  let record = await Class.findOne({ className, academicYear: YEAR });
  if (!record) {
    record = await Class.create({
      className,
      gradeLevel,
      stream: "Commerce",
      medium: "English",
      academicYear: YEAR,
    });
  } else {
    record.stream = "Commerce";
    record.gradeLevel = gradeLevel;
    await record.save();
  }
  return record;
}

async function upsertSubject({ subjectName, subjectCode }) {
  let record = await Subject.findOne({ subjectCode });
  if (!record) {
    record = await Subject.create({
      subjectName,
      subjectCode,
      isActive: true,
    });
  }
  return record;
}

async function upsertUser({ email, fullName, phoneNumber, role, extra = {} }) {
  const hashed = await bcrypt.hash(PASSWORD, 10);
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      fullName,
      email,
      phoneNumber,
      password: hashed,
      role,
      isActive: true,
      ...extra,
    });
  } else {
    user.fullName = fullName;
    user.phoneNumber = phoneNumber;
    user.password = hashed;
    user.isActive = true;
    user.role = role;
    Object.assign(user, extra);
    await user.save();
  }
  return user;
}

async function upsertExam({ examName, classId, subjectId }) {
  let exam = await Exam.findOne({ examName, class: classId, subject: subjectId });
  if (!exam) {
    exam = await Exam.create({
      examName,
      class: classId,
      subject: subjectId,
      examDate: new Date(),
      totalMarks: 100,
    });
  }
  return exam;
}

async function upsertResult({ studentProfileId, examId, marks }) {
  let result = await Result.findOne({ student: studentProfileId, exam: examId });
  if (result) {
    result.marks = marks;
    result.grade = calculateGrade(marks);
    await result.save();
    return result;
  }
  return Result.create({
    student: studentProfileId,
    exam: examId,
    marks,
    grade: calculateGrade(marks),
    rank: 0,
    zScore: 0,
  });
}

async function seedAttendance(studentProfileId, classId, rate) {
  await Attendance.deleteMany({ student: studentProfileId });
  const today = new Date();
  for (let day = 20; day >= 1; day -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - day);
    const present = day / 20 <= rate;
    await Attendance.create({
      student: studentProfileId,
      class: classId,
      date,
      status: present ? "Present" : "Absent",
    });
  }
  const total = 20;
  const presentCount = await Attendance.countDocuments({
    student: studentProfileId,
    status: "Present",
  });
  return Number(((presentCount / total) * 100).toFixed(1));
}

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI missing — copy backend/.env.example to backend/.env");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const class12 = await upsertClass({
    className: "12 Commerce A",
    gradeLevel: 12,
  });
  const class13 = await upsertClass({
    className: "13 Commerce A",
    gradeLevel: 13,
  });

  const accounting = await upsertSubject({
    subjectName: "Accounting",
    subjectCode: "ACC101",
  });
  const business = await upsertSubject({
    subjectName: "Business Studies",
    subjectCode: "BS101",
  });
  const economics = await upsertSubject({
    subjectName: "Economics",
    subjectCode: "ECO101",
  });

  await Subject.updateMany(
    { _id: { $in: [accounting._id, business._id, economics._id] } },
    { $addToSet: { classes: class12._id } }
  );

  const teacher = await upsertUser({
    email: "teacher@edutrack.test",
    fullName: "Commerce Teacher",
    phoneNumber: "0772000001",
    role: "teacher",
    extra: { teacherId: "TCH-COM-001" },
  });

  await Subject.updateMany(
    { _id: { $in: [accounting._id, business._id, economics._id] } },
    { assignedTeacher: teacher._id }
  );
  class12.assignedTeacher = teacher._id;
  await class12.save();

  const parent = await upsertUser({
    email: "parent@edutrack.test",
    fullName: "Demo Parent",
    phoneNumber: "0773000001",
    role: "parent",
    extra: { parentId: "PAR-COM-001", relationship: "Mother" },
  });

  const examAcc = await upsertExam({
    examName: "Term Test 1 - Accounting",
    classId: class12._id,
    subjectId: accounting._id,
  });
  const examBs = await upsertExam({
    examName: "Term Test 1 - Business Studies",
    classId: class12._id,
    subjectId: business._id,
  });
  const examEco = await upsertExam({
    examName: "Term Test 1 - Economics",
    classId: class12._id,
    subjectId: economics._id,
  });

  for (const demo of STUDENTS) {
    const user = await upsertUser({
      email: demo.email,
      fullName: demo.fullName,
      phoneNumber: demo.phoneNumber,
      role: "student",
    });

    let profile = await StudentProfile.findOne({ studentId: demo.studentId });
    if (!profile) {
      profile = await StudentProfile.create({
        user: user._id,
        studentId: demo.studentId,
        class: class12._id,
        academicYear: YEAR,
        subjects: [accounting._id, business._id, economics._id],
        parent: parent._id,
        riskStatus: demo.riskStatus,
      });
    } else {
      profile.user = user._id;
      profile.class = class12._id;
      profile.academicYear = YEAR;
      profile.subjects = [accounting._id, business._id, economics._id];
      profile.parent = parent._id;
      profile.riskStatus = demo.riskStatus;
      await profile.save();
    }

    await Class.updateOne(
      { _id: class12._id },
      { $addToSet: { students: user._id } }
    );

    await upsertResult({
      studentProfileId: profile._id,
      examId: examAcc._id,
      marks: demo.marks.accounting,
    });
    await upsertResult({
      studentProfileId: profile._id,
      examId: examBs._id,
      marks: demo.marks.business,
    });
    await upsertResult({
      studentProfileId: profile._id,
      examId: examEco._id,
      marks: demo.marks.economics,
    });

    const attendancePercentage = await seedAttendance(
      profile._id,
      class12._id,
      demo.attendanceRate
    );
    profile.attendancePercentage = attendancePercentage;
    await profile.save();

    await CommerceRisk.deleteMany({ studentProfile: profile._id });
    await CommerceRisk.create({
      studentProfile: profile._id,
      studentId: demo.studentId,
      inputData: {
        accountingScore: demo.marks.accounting,
        businessStudiesScore: demo.marks.business,
        economicsScore: demo.marks.economics,
        attendancePercentage,
      },
      riskLevel: demo.riskLevel,
      modelName: "Commerce Multi-Class Risk Model",
      predictionSource: "Automatic",
      predictedBy: teacher._id,
    });

    console.log(
      `✓ ${demo.fullName} (${demo.studentId}) → ${demo.riskLevel}, attendance ${attendancePercentage}%`
    );
  }

  console.log("\nDemo accounts (password: 123456)");
  console.log("  teacher@edutrack.test");
  console.log("  parent@edutrack.test");
  STUDENTS.forEach((s) => console.log(`  ${s.email}  [${s.riskLevel}]`));
  console.log(`\nClasses: ${class12.className}, ${class13.className}`);
  console.log("Subjects: Accounting, Business Studies, Economics");

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
