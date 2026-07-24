import ExamTimetable from "../models/ExamTimetable.js";
import { createAuditLog } from "../utils/createAuditLog.js";

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
    const timetables = await ExamTimetable.find()
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
    const timetable = await ExamTimetable.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!timetable) {
      return res.status(404).json({
        message: "Exam timetable not found",
      });
    }

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
    res.status(500).json({ message: error.message });
  }
};