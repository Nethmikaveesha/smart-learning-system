import Exam from "../models/Exam.js";

export const createExam = async (req, res) => {
  try {
    const {
      examName,
      classId,
      subjectId,
      examDate,
      totalMarks,
    } = req.body;

    const exam = await Exam.create({
      examName,
      class: classId,
      subject: subjectId,
      examDate,
      totalMarks,
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
      .populate("class", "className")
      .populate("subject", "subjectName");

    res.status(200).json(exams);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};