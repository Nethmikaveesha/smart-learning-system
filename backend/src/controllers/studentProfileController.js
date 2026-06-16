import StudentProfile from "../models/StudentProfile.js";

export const createStudentProfile = async (req, res) => {
  try {
    const {
      user,
      studentId,
      classId,
      parent,
      subjects,
    } = req.body;

    const profile = await StudentProfile.create({
      user,
      studentId,
      class: classId,
      parent,
      subjects,
    });

    res.status(201).json({
      message: "Student Profile Created Successfully",
      profile,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getAllStudentProfiles = async (req, res) => {
  try {
    const profiles = await StudentProfile.find()
      .populate("user", "fullName email")
      .populate("class", "className")
      .populate("subjects", "subjectName")
      .populate("parent", "fullName email");

    res.status(200).json(profiles);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};