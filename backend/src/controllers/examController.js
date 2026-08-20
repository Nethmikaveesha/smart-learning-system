import Exam from "../models/Exam.js";
import { createAuditLog } from "../utils/createAuditLog.js";
import {
  assertTeacherOwnsClass,
  assertTeacherOwnsSubject,
  getTeacherScope,
} from "../utils/teacherScope.js";

export const createExam = async (req, res) => {
  try {
    const {
      examName,
      classId,
      subjectId,
      examDate,
      totalMarks,
    } = req.body;

    if (!examName?.trim() || !classId || !subjectId || !examDate) {
      return res.status(400).json({
        message: "examName, classId, subjectId, and examDate are required",
      });
    }

    if (req.user?.role === "teacher") {
      const ownsClass = await assertTeacherOwnsClass(req.user._id, classId);
      const ownsSubject = await assertTeacherOwnsSubject(
        req.user._id,
        subjectId
      );

      if (!ownsClass && !ownsSubject) {
        return res.status(403).json({
          message:
            "You can only create exams for classes or subjects assigned to you",
        });
      }
    }

    const exam = await Exam.create({
      examName,
      class: classId,
      subject: subjectId,
      examDate,
      totalMarks,
    });

    await createAuditLog({
      userId: req.user?._id,
      action: "CREATE",
      module: "Exam",
      description: `Exam created: ${examName}`,
    });

    res.status(201).json({
      message: "Exam created successfully",
      exam,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getAllExams = async (req, res) => {
  try {
    const filter = {};

    if (req.user?.role === "teacher") {
      const scope = await getTeacherScope(req.user._id);
      filter.$or = [
        { class: { $in: scope.classIds } },
        { subject: { $in: scope.subjectIds } },
      ];

      // No assignments → empty list (do not leak school-wide exams).
      if (scope.classIds.length === 0 && scope.subjectIds.length === 0) {
        return res.status(200).json([]);
      }
    }

    const exams = await Exam.find(filter)
      .populate("class", "className gradeLevel academicYear")
      .populate("subject", "subjectName subjectCode");

    res.status(200).json(exams);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};