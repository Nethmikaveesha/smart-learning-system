import StudentProfile from "../models/StudentProfile.js";

export const getRiskNotifications = async (req, res) => {
  try {
    const riskStudents = await StudentProfile.find({
      riskStatus: { $in: ["High", "Medium"] },
    })
      .populate("user", "fullName email")
      .populate("class", "className")
      .populate("parent", "fullName email");

    const notifications = riskStudents.map((student) => ({
      studentId: student.studentId,
      studentName: student.user?.fullName || "Unknown Student",
      className: student.class?.className || "N/A",
      attendancePercentage: student.attendancePercentage,
      currentZScore: student.currentZScore,
      riskStatus: student.riskStatus,
      message:
        student.riskStatus === "High"
          ? `${student.user?.fullName || "This student"} is at high academic risk. Immediate attention is recommended.`
          : `${student.user?.fullName || "This student"} is at medium academic risk. Additional monitoring is recommended.`,
    }));

    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};