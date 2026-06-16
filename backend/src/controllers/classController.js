import Class from "../models/Class.js";

export const createClass = async (req, res) => {
  try {
    const { className, academicYear, assignedTeacher } = req.body;

    const newClass = await Class.create({
      className,
      academicYear,
      assignedTeacher,
    });

    res.status(201).json({
      message: "Class created successfully",
      class: newClass,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllClasses = async (req, res) => {
  try {
    const classes = await Class.find()
      .populate("assignedTeacher", "fullName email role")
      .populate("students", "fullName email role");

    res.status(200).json(classes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};