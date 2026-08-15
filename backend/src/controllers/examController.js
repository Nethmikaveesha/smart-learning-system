import Exam from "../models/Exam.js";
import { createAuditLog } from "../utils/createAuditLog.js";

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
    const exams = await Exam.find()
      .populate("class", "className gradeLevel academicYear")
      .populate("subject", "subjectName subjectCode");

    res.status(200).json(exams);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};