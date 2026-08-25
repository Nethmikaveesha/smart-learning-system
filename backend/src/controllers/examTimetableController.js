import Exam from "../models/Exam.js";
import ExamTimetable from "../models/ExamTimetable.js";
import StudentProfile from "../models/StudentProfile.js";
import { createAuditLog } from "../utils/createAuditLog.js";
import {
  assertTeacherOwnsClass,
  assertTeacherOwnsSubject,
  getTeacherScope,
} from "../utils/teacherScope.js";
import { linkedStudentsQuery } from "../utils/parentLinks.js";

function toDateInputValue(value) {
  if (!value) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date;
}

export const createExamTimetable = async (req, res) => {
  try {
    const {
      examId,
      examName,
      classId,
      subjectId,
      examDate,
      startTime,
      endTime,
      location,
      instructions,
    } = req.body;

    if (!startTime || !endTime) {
      return res.status(400).json({
        message: "startTime and endTime are required",
      });
    }

    if (String(startTime) >= String(endTime)) {
      return res.status(400).json({
        message: "End time must be after start time",
      });
    }

    let resolvedName = examName;
    let resolvedClassId = classId;
    let resolvedSubjectId = subjectId;
    let resolvedDate = examDate;
    let linkedExamId = null;

    if (examId) {
      const exam = await Exam.findById(examId);
      if (!exam) {
        return res.status(404).json({ message: "Linked exam not found" });
      }

      const alreadyScheduled = await ExamTimetable.findOne({ exam: exam._id });
      if (alreadyScheduled) {
        return res.status(409).json({
          message:
            "A timetable already exists for this exam. Edit that timetable instead of creating a duplicate.",
        });
      }

      linkedExamId = exam._id;
      resolvedName = exam.examName;
      resolvedClassId = exam.class;
      resolvedSubjectId = exam.subject;
      resolvedDate = exam.examDate;
    }

    if (
      !resolvedName?.trim() ||
      !resolvedClassId ||
      !resolvedSubjectId ||
      !resolvedDate
    ) {
      return res.status(400).json({
        message:
          "Select a linked exam, or provide examName, classId, subjectId, and examDate",
      });
    }

    if (req.user?.role === "teacher") {
      const ownsClass = await assertTeacherOwnsClass(
        req.user._id,
        resolvedClassId
      );
      const ownsSubject = await assertTeacherOwnsSubject(
        req.user._id,
        resolvedSubjectId
      );
      if (!ownsClass && !ownsSubject) {
        return res.status(403).json({
          message:
            "You can only create timetables for classes or subjects assigned to you",
        });
      }
    }

    const timetable = await ExamTimetable.create({
      exam: linkedExamId || undefined,
      examName: String(resolvedName).trim(),
      class: resolvedClassId,
      subject: resolvedSubjectId,
      examDate: toDateInputValue(resolvedDate),
      startTime,
      endTime,
      location: location || "Main Hall",
      instructions: instructions || "",
    });

    await createAuditLog({
      userId: req.user?._id,
      action: "CREATE",
      module: "Exam Timetable",
      description: `Exam timetable created: ${timetable.examName}`,
    });

    res.status(201).json({
      message: "Exam timetable created successfully",
      timetable,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message:
          "A timetable already exists for this exam. Edit that timetable instead of creating a duplicate.",
      });
    }
    res.status(500).json({ message: error.message });
  }
};

export const getAllExamTimetables = async (req, res) => {
  try {
    const filter = {};

    if (req.user?.role === "student") {
      const profile = await StudentProfile.findOne({
        user: req.user._id,
      }).select("class");

      if (!profile?.class) {
        return res.status(200).json([]);
      }

      filter.class = profile.class;
    } else if (req.user?.role === "parent") {
      const children = await StudentProfile.find(
        linkedStudentsQuery(req.user._id)
      ).select("class");

      const classIds = [
        ...new Set(
          children.map((child) => child.class?.toString()).filter(Boolean)
        ),
      ];

      if (classIds.length === 0) {
        return res.status(200).json([]);
      }

      filter.class = { $in: classIds };
    } else if (req.user?.role === "teacher") {
      const scope = await getTeacherScope(req.user._id);
      if (scope.classIds.length === 0) {
        return res.status(200).json([]);
      }
      filter.class = { $in: scope.classIds };
    }

    const timetables = await ExamTimetable.find(filter)
      .populate("class", "className gradeLevel academicYear")
      .populate("subject", "subjectName subjectCode")
      .populate("exam", "examName totalMarks")
      .sort({ examDate: -1, startTime: 1 });

    res.status(200).json(timetables);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateExamTimetable = async (req, res) => {
  try {
    const {
      examName,
      classId,
      subjectId,
      examDate,
      startTime,
      endTime,
      location,
      instructions,
    } = req.body;

    const existing = await ExamTimetable.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        message: "Exam timetable not found",
      });
    }

    if (req.user?.role === "teacher") {
      const ownsCurrent = await assertTeacherOwnsClass(
        req.user._id,
        existing.class
      );
      if (!ownsCurrent) {
        return res.status(403).json({
          message: "You can only update timetables for your assigned classes",
        });
      }
    }

    const nextStart = startTime !== undefined ? startTime : existing.startTime;
    const nextEnd = endTime !== undefined ? endTime : existing.endTime;
    if (nextStart && nextEnd && String(nextStart) >= String(nextEnd)) {
      return res.status(400).json({
        message: "End time must be after start time",
      });
    }

    // Linked exam keeps name/class/subject/date aligned with Marks exams.
    const update = {
      ...(startTime !== undefined ? { startTime } : {}),
      ...(endTime !== undefined ? { endTime } : {}),
      ...(location !== undefined ? { location } : {}),
      ...(instructions !== undefined ? { instructions } : {}),
    };

    if (!existing.exam) {
      if (examName !== undefined) update.examName = examName;
      if (classId !== undefined) update.class = classId;
      if (subjectId !== undefined) update.subject = subjectId;
      if (examDate !== undefined) update.examDate = examDate;
    }

    const timetable = await ExamTimetable.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    )
      .populate("class", "className gradeLevel academicYear")
      .populate("subject", "subjectName subjectCode")
      .populate("exam", "examName totalMarks");

    await createAuditLog({
      userId: req.user?._id,
      action: "UPDATE",
      module: "Exam Timetable",
      description: `Exam timetable updated: ${timetable.examName}`,
    });

    res.status(200).json({
      message: "Exam timetable updated successfully",
      timetable,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteExamTimetable = async (req, res) => {
  try {
    const timetable = await ExamTimetable.findById(req.params.id);

    if (!timetable) {
      return res.status(404).json({
        message: "Exam timetable not found",
      });
    }

    const examName = timetable.examName;

    await timetable.deleteOne();

    await createAuditLog({
      userId: req.user?._id,
      action: "DELETE",
      module: "Exam Timetable",
      description: `Exam timetable deleted: ${examName}`,
    });

    res.status(200).json({
      message: "Exam timetable deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
