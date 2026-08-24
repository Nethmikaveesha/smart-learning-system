import Exam from "../models/Exam.js";
import { createAuditLog } from "../utils/createAuditLog.js";
import {
  assertTeacherOwnsClass,
  assertTeacherOwnsSubject,
  getTeacherScope,
  resolveSubjectTwinIds,
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
    if (req.user?.role !== "teacher") {
      const exams = await Exam.find()
        .populate("class", "className gradeLevel academicYear")
        .populate("subject", "subjectName subjectCode")
        .sort({ examDate: -1, createdAt: -1 });
      return res.status(200).json(exams);
    }

    const scope = await getTeacherScope(req.user._id);

    // No assignments → empty list (do not leak school-wide exams).
    if (scope.classIds.length === 0 && scope.subjectIds.length === 0) {
      return res.status(200).json([]);
    }

    const populateOptions = [
      { path: "class", select: "className gradeLevel academicYear" },
      { path: "subject", select: "subjectName subjectCode" },
    ];

    let exams = [];

    // 1) Preferred: exams for assigned subject(s), including duplicate
    //    Subject catalog rows that share the same name/code.
    if (scope.subjectIds.length > 0) {
      const twinSubjectIds = await resolveSubjectTwinIds(scope.subjectIds);
      exams = await Exam.find({ subject: { $in: twinSubjectIds } })
        .populate(populateOptions)
        .sort({ examDate: -1, createdAt: -1 });
    }

    // 2) Fallback: exams in the teacher's classes whose subject NAME matches
    //    an assigned subject (handles Exam.subject ObjectId drift).
    if (exams.length === 0 && scope.classIds.length > 0) {
      const classExams = await Exam.find({ class: { $in: scope.classIds } })
        .populate(populateOptions)
        .sort({ examDate: -1, createdAt: -1 });

      if (scope.subjectLabels.length > 0) {
        const labelSet = new Set(
          scope.subjectLabels.map((label) => String(label).trim().toLowerCase())
        );
        exams = classExams.filter((exam) =>
          labelSet.has(
            String(exam.subject?.subjectName || "")
              .trim()
              .toLowerCase()
          )
        );
      } else {
        // Class-only teacher (no subject assignment): show class exams.
        exams = classExams;
      }
    }

    // 3) Last safe fallback for Marks: if subject query found nothing but the
    //    teacher has classes, show class exams. Better a usable Marks page
    //    than a permanently empty dropdown when seed data drifted.
    if (exams.length === 0 && scope.classIds.length > 0) {
      exams = await Exam.find({ class: { $in: scope.classIds } })
        .populate(populateOptions)
        .sort({ examDate: -1, createdAt: -1 });
    }

    res.status(200).json(exams);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
