import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Class from "../models/Class.js";
import StudentProfile from "../models/StudentProfile.js";
import Subject from "../models/Subject.js";
import jwt from "jsonwebtoken";
import {
  resolveClass,
  resolveOrCreateClass,
  resolveStudentProfile,
  resolveSubject,
} from "../utils/resolveReference.js";
import { createAuditLog } from "../utils/createAuditLog.js";

export const registerAdmin = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, password, confirmPassword, status } =
      req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        message: "Full name, email, and password are required",
      });
    }

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
      role: "admin",
      isActive: status ? status === "Active" : true,
    });

    await createAuditLog({
      userId: req.user?._id,
      action: "CREATE",
      module: "User Management",
      description: `Created admin account: ${user.fullName}`,
    });

    res.status(201).json({
      message: "Admin registered successfully",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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
      className,
      academicYear,
      parent,
      parentId,
      childStudent,
      relationship,
    } = req.body;

    if (role === "admin") {
      return res.status(400).json({
        message: "Use the admin registration endpoint to create admin accounts",
      });
    }

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
        const subject = await resolveSubject(assignedSubject);

        if (!subject) {
          return res.status(404).json({
            message: `Subject not found for reference: ${assignedSubject}`,
          });
        }

        await Subject.findByIdAndUpdate(subject._id, {
          assignedTeacher: user._id,
        });
      }

      if (assignedClass) {
        const classRecord = await resolveOrCreateClass(assignedClass);

        await Class.findByIdAndUpdate(classRecord._id, {
          assignedTeacher: user._id,
        });
      }
    }

    if (role === "student" && studentId) {
      const classRecord = className
        ? await resolveOrCreateClass(className, academicYear)
        : null;

      profile = await StudentProfile.create({
        user: user._id,
        studentId,
        class: classRecord?._id || undefined,
        parent: parent || undefined,
        academicYear,
      });

      if (classRecord) {
        await Class.findByIdAndUpdate(classRecord._id, {
          $addToSet: { students: user._id },
        });
      }
    }

    if (role === "parent" && childStudent) {
      const studentProfile = await resolveStudentProfile(childStudent);

      if (!studentProfile) {
        return res.status(404).json({
          message: `Student profile not found for reference: ${childStudent}`,
        });
      }

      profile = await StudentProfile.findByIdAndUpdate(
        studentProfile._id,
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
