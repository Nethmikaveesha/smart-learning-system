import Subject from "../models/Subject.js";

export const createSubject = async (req, res) => {
  try {
    const { subjectName, subjectCode } = req.body;

    const subject = await Subject.create({
      subjectName,
      subjectCode,
    });

    res.status(201).json({
      message: "Subject created successfully",
      subject,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getAllSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find()
      .populate("assignedTeacher", "fullName email")
      .populate("classes", "className");

    res.status(200).json(subjects);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};