import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Class from "../models/Class.js";
import StudentProfile from "../models/StudentProfile.js";
import Subject from "../models/Subject.js";
import jwt from "jsonwebtoken";
export const registerUser = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phoneNumber,
      password,
      confirmPassword,
      role,
      status,
      teacherId,
      assignedSubject,
      assignedClass,
      studentId,
      classId,
      academicYear,
      parent,
      parentId,
      childStudent,
      relationship,
    } = req.body;

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        message: "Password and confirm password do not match",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      email,
      phoneNumber,
      password: hashedPassword,
      role,
      isActive: status ? status === "Active" : true,
      teacherId: role === "teacher" ? teacherId : undefined,
      parentId: role === "parent" ? parentId : undefined,
      relationship: role === "parent" ? relationship : "",
    });

    let profile = null;

    if (role === "teacher") {
      if (assignedSubject) {
        await Subject.findByIdAndUpdate(assignedSubject, {
          assignedTeacher: user._id,
        });
      }

      if (assignedClass) {
        await Class.findByIdAndUpdate(assignedClass, {
          assignedTeacher: user._id,
        });
      }
    }

    if (role === "student" && studentId) {
      profile = await StudentProfile.create({
        user: user._id,
        studentId,
        class: classId || undefined,
        parent: parent || undefined,
        academicYear,
      });

      if (classId) {
        await Class.findByIdAndUpdate(classId, {
          $addToSet: { students: user._id },
        });
      }
    }

    if (role === "parent" && childStudent) {
      profile = await StudentProfile.findByIdAndUpdate(
        childStudent,
        { parent: user._id },
        { new: true }
      );
    }

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isActive: user.isActive,
      },
      profile,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "This account is inactive. Please contact admin.",
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
