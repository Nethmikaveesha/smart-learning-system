import StudentProfile from "../models/StudentProfile.js";
import { getTeacherScope } from "../utils/teacherScope.js";
import { linkedStudentsQuery } from "../utils/parentLinks.js";

export const getRiskNotifications = async (req, res) => {
  try {
    const filter = {
      riskStatus: { $in: ["High", "Medium"] },
    };

    // Parents only see their own linked children — never school-wide PII.
    if (req.user?.role === "parent") {
      Object.assign(filter, linkedStudentsQuery(req.user._id));
    }

    // Teachers only see at-risk students in their assigned classes.
    if (req.user?.role === "teacher") {
      const scope = await getTeacherScope(req.user._id);
      if (scope.classIds.length === 0) {
        return res.status(200).json([]);
      }
      filter.class = { $in: scope.classIds };
    }

    const riskStudents = await StudentProfile.find(filter)
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
