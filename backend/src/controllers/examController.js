import Exam from "../models/Exam.js";
import { createAuditLog } from "../utils/createAuditLog.js";
import {
  assertTeacherOwnsSubject,
  getTeacherScope,
  resolveClassTwinIds,
  resolveSubjectTwinIds,
} from "../utils/teacherScope.js";

async function resolveTeacherExamClassIds(scope) {
  const seedClassIds =
    scope.adminAssignedClassIds?.length > 0
      ? scope.adminAssignedClassIds
      : [];

  if (!seedClassIds.length) return [];

  const classIdLists = await Promise.all(
    seedClassIds.map((classId) =>
      resolveClassTwinIds(classId, { ignoreYear: true })
    )
  );

  return [...new Set(classIdLists.flat().map((id) => String(id)))];
}

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
      const scope = await getTeacherScope(req.user._id);
      const allowedClassIds = await resolveTeacherExamClassIds(scope);
      const ownsClass = allowedClassIds.includes(String(classId));
      const ownsSubject = await assertTeacherOwnsSubject(
        req.user._id,
        subjectId
      );

      if (!ownsClass || !ownsSubject) {
        return res.status(403).json({
          message:
            "You can only create exams for the class and subject assigned to you",
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
    const allowedClassIds = await resolveTeacherExamClassIds(scope);

    // No admin-assigned class → empty list (do not leak other classes).
    if (!allowedClassIds.length) {
      return res.status(200).json([]);
    }

    const filter = {
      class: { $in: allowedClassIds },
    };

    // Keep the list on the teacher's assigned subject (+ catalog twins).
    if (scope.subjectIds.length > 0) {
      const twinSubjectIds = await resolveSubjectTwinIds(scope.subjectIds);
      filter.subject = { $in: twinSubjectIds };
    }

    const exams = await Exam.find(filter)
      .populate("class", "className gradeLevel academicYear")
      .populate("subject", "subjectName subjectCode")
      .sort({ examDate: -1, createdAt: -1 });

    // If subject ObjectIds drifted but class exams exist, fall back to class
    // exams whose subject NAME matches the teacher's assigned subject.
    if (exams.length === 0 && scope.subjectLabels.length > 0) {
      const classExams = await Exam.find({
        class: { $in: allowedClassIds },
      })
        .populate("class", "className gradeLevel academicYear")
        .populate("subject", "subjectName subjectCode")
        .sort({ examDate: -1, createdAt: -1 });

      const labelSet = new Set(
        scope.subjectLabels.map((label) => String(label).trim().toLowerCase())
      );

      return res.status(200).json(
        classExams.filter((exam) =>
          labelSet.has(
            String(exam.subject?.subjectName || "")
              .trim()
              .toLowerCase()
          )
        )
      );
    }

    res.status(200).json(exams);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
