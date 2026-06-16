import Attendance from "../models/Attendance.js";
import StudentProfile from "../models/StudentProfile.js";

export const markAttendance = async (req, res) => {
  try {
    const { student, classId, date, status } = req.body;

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