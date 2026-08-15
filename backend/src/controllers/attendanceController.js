import Attendance from "../models/Attendance.js";
import StudentProfile from "../models/StudentProfile.js";
import { createAuditLog } from "../utils/createAuditLog.js";
import { assertCanAccessStudentProfile } from "../utils/studentAccess.js";

export const markAttendance = async (req, res) => {
  try {
    const { student, classId, date, status } = req.body;

    if (!student || !classId || !date || !status) {
      return res.status(400).json({
        message: "student, classId, date, and status are required",
      });
    }

    const allowedStatus = ["Present", "Absent", "Late"];
    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        message: `status must be one of: ${allowedStatus.join(", ")}`,
      });
    }

    const profile = await StudentProfile.findById(student);
    if (!profile) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const attendance = await Attendance.create({
      student,
      class: classId,
      date,
      status,
    });

    const totalDays = await Attendance.countDocuments({ student });
    const presentDays = await Attendance.countDocuments({
      student,
      status: "Present",
    });

    const attendancePercentage =
      totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    await StudentProfile.findByIdAndUpdate(student, {
      attendancePercentage,
    });

    await createAuditLog({
      userId: req.user?._id,
      action: "CREATE",
      module: "Attendance",
      description: `Attendance marked as ${status}`,
    });

    res.status(201).json({
      message: "Attendance marked successfully",
      attendance,
      attendancePercentage,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAttendanceByStudent = async (req, res) => {
  try {
    const access = await assertCanAccessStudentProfile(
      req,
      req.params.studentId
    );

    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const records = await Attendance.find({
      student: req.params.studentId,
    })
      .populate("student", "studentId")
      .populate("class", "className");

    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
