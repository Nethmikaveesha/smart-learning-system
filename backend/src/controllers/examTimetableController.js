import ExamTimetable from "../models/ExamTimetable.js";
import StudentProfile from "../models/StudentProfile.js";
import { createAuditLog } from "../utils/createAuditLog.js";
import {
  assertTeacherOwnsClass,
  assertTeacherOwnsSubject,
  getTeacherScope,
} from "../utils/teacherScope.js";
import { linkedStudentsQuery } from "../utils/parentLinks.js";

export const createExamTimetable = async (req, res) => {
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

    if (req.user?.role === "teacher") {
      const ownsClass = await assertTeacherOwnsClass(req.user._id, classId);
      const ownsSubject = await assertTeacherOwnsSubject(
        req.user._id,
        subjectId
      );
      if (!ownsClass && !ownsSubject) {
        return res.status(403).json({
          message:
            "You can only create timetables for classes or subjects assigned to you",
        });
      }
    }

    const timetable = await ExamTimetable.create({
      examName,
      class: classId,
      subject: subjectId,
      examDate,
      startTime,
      endTime,
      location,
      instructions,
    });

    await createAuditLog({
      userId: req.user?._id,
      action: "CREATE",
      module: "Exam Timetable",
      description: `Exam timetable created: ${examName}`,
    });

    res.status(201).json({
      message: "Exam timetable created successfully",
      timetable,
    });
  } catch (error) {
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
          children
            .map((child) => child.class?.toString())
            .filter(Boolean)
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
      .sort({ examDate: 1 });

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

    const update = {
      ...(examName !== undefined ? { examName } : {}),
      ...(classId !== undefined ? { class: classId } : {}),
      ...(subjectId !== undefined ? { subject: subjectId } : {}),
      ...(examDate !== undefined ? { examDate } : {}),
      ...(startTime !== undefined ? { startTime } : {}),
      ...(endTime !== undefined ? { endTime } : {}),
      ...(location !== undefined ? { location } : {}),
      ...(instructions !== undefined ? { instructions } : {}),
    };

    const timetable = await ExamTimetable.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

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
