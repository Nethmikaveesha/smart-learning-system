import StudentProfile from "../models/StudentProfile.js";
import Result from "../models/Result.js";
import Exam from "../models/Exam.js";
import ExamTimetable from "../models/ExamTimetable.js";
import Class from "../models/Class.js";
import Subject from "../models/Subject.js";
import { resolveCommerceSubjectMarks } from "../utils/commerceMarks.js";

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Include duplicate class rows that share the same name + academic year. */
async function expandClassIds(classDoc) {
  if (!classDoc?._id) return [];

  const ids = [classDoc._id];
  if (!classDoc.className) return ids;

  const query = {
    className: {
      $regex: `^${escapeRegex(String(classDoc.className).trim())}$`,
      $options: "i",
    },
  };
  if (classDoc.academicYear) {
    query.academicYear = String(classDoc.academicYear);
  }

  const twins = await Class.find(query).select("_id");
  for (const twin of twins) {
    if (!ids.some((id) => String(id) === String(twin._id))) {
      ids.push(twin._id);
    }
  }
  return ids;
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function subjectKey(subject) {
  return String(
    subject?.subjectName || subject?.subjectCode || subject || ""
  )
    .trim()
    .toLowerCase();
}

/**
 * Resolve which classes a student should see exams for.
 * Prefers profile.class; otherwise infers from latest exam result or
 * subject→class links, and soft-heals the profile when confident.
 */
async function resolveStudentClassIds(studentProfile) {
  let classDoc = studentProfile.class || null;

  if (!classDoc) {
    const latestWithClass = await Result.findOne({
      student: studentProfile._id,
    })
      .populate({
        path: "exam",
        select: "class",
        populate: { path: "class", select: "className academicYear" },
      })
      .sort({ createdAt: -1 });

    classDoc = latestWithClass?.exam?.class || null;
  }

  if (!classDoc) {
    const subjectIds = (studentProfile.subjects || [])
      .map((item) => item?._id || item)
      .filter(Boolean);

    if (subjectIds.length > 0) {
      const subjects = await Subject.find({ _id: { $in: subjectIds } }).select(
        "classes"
      );
      const linkedClassIds = subjects.flatMap((item) => item.classes || []);
      if (linkedClassIds.length > 0) {
        classDoc = await Class.findById(linkedClassIds[0]).select(
          "className academicYear"
        );
      }
    }
  }

  if (classDoc && !studentProfile.class) {
    studentProfile.class = classDoc._id;
    await studentProfile.save();
  }

  const classIds = classDoc ? await expandClassIds(classDoc) : [];
  return { classDoc, classIds };
}

function buildTimetableRow(examLike, results, commerceBySubject, today) {
  const examSubjectId = examLike.subject?._id?.toString();
  const examSubjectName = subjectKey(examLike.subject);

  const subjectResults = results.filter((result) => {
    const resultSubjectId = result.exam?.subject?._id?.toString();
    const resultSubjectName = subjectKey(result.exam?.subject);
    if (examSubjectId && resultSubjectId === examSubjectId) return true;
    if (examSubjectName && resultSubjectName === examSubjectName) return true;
    return false;
  });

  let averageMarks =
    subjectResults.length > 0
      ? subjectResults.reduce((sum, row) => sum + Number(row.marks || 0), 0) /
        subjectResults.length
      : null;

  if (averageMarks == null && examSubjectName) {
    for (const [name, marks] of Object.entries(commerceBySubject)) {
      if (name.includes(examSubjectName) || examSubjectName.includes(name)) {
        averageMarks = marks;
        break;
      }
    }
  }

  if (averageMarks == null) averageMarks = 0;

  const examDate = new Date(examLike.examDate);
  const daysRemaining = Math.max(
    1,
    Math.ceil((examDate - today) / (1000 * 60 * 60 * 24))
  );

  let priority = "Low";
  let dailyStudyHours = 1;

  if (averageMarks < 35) {
    priority = "High";
    dailyStudyHours = 3;
  } else if (averageMarks < 65) {
    priority = "Medium";
    dailyStudyHours = 2;
  }

  if (daysRemaining <= 7) {
    dailyStudyHours += 1;
  }

  return {
    examName: examLike.examName,
    subject: examLike.subject?.subjectName || "Subject",
    examDate: examLike.examDate,
    daysRemaining,
    averageMarks: Number(Number(averageMarks).toFixed(2)),
    priority,
    dailyStudyHours,
    recommendation:
      priority === "High"
        ? "Revise this subject daily and focus on weak areas."
        : priority === "Medium"
          ? "Revise this subject regularly and practise past questions."
          : "Maintain revision with short daily sessions.",
  };
}

export const generateStudyPlan = async (req, res) => {
  try {
    const studentProfile = await StudentProfile.findOne({
      user: req.user._id,
    }).populate("subjects", "subjectName");

    if (!studentProfile) {
      return res.status(404).json({
        message: "Student profile not found",
      });
    }

    const results = await Result.find({
      student: studentProfile._id,
    }).populate({
      path: "exam",
      populate: {
        path: "subject",
        select: "subjectName",
      },
    });

    const subjectPlans = studentProfile.subjects.map((subject) => {
      const subjectResults = results.filter(
        (result) =>
          result.exam?.subject?._id?.toString() === subject._id.toString()
      );

      const averageMarks =
        subjectResults.length > 0
          ? subjectResults.reduce((sum, r) => sum + r.marks, 0) /
            subjectResults.length
          : 0;

      let recommendedHours = 1;
      let priority = "Low";

      if (averageMarks < 35) {
        recommendedHours = 3;
        priority = "High";
      } else if (averageMarks < 65) {
        recommendedHours = 2;
        priority = "Medium";
      }

      return {
        subject: subject.subjectName,
        averageMarks: Number(averageMarks.toFixed(2)),
        recommendedHours,
        priority,
      };
    });

    res.status(200).json({
      message: "Study plan generated successfully",
      studentId: studentProfile.studentId,
      plan: subjectPlans,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const generateRevisionTimetable = async (req, res) => {
  try {
    const studentProfile = await StudentProfile.findOne({
      user: req.user._id,
    })
      .populate("subjects", "subjectName subjectCode")
      .populate("class", "className academicYear");

    if (!studentProfile) {
      return res.status(404).json({
        message: "Student profile not found",
      });
    }

    const { classDoc, classIds } = await resolveStudentClassIds(studentProfile);
    const today = startOfToday();
    const subjectIds = (studentProfile.subjects || [])
      .map((item) => item?._id || item)
      .filter(Boolean);

    let upcomingExams = [];
    let upcomingTimetableRows = [];

    if (classIds.length > 0) {
      [upcomingExams, upcomingTimetableRows] = await Promise.all([
        Exam.find({
          class: { $in: classIds },
          examDate: { $gte: today },
          isActive: { $ne: false },
        })
          .populate("subject", "subjectName subjectCode")
          .sort({ examDate: 1 }),
        ExamTimetable.find({
          class: { $in: classIds },
          examDate: { $gte: today },
        })
          .populate("subject", "subjectName subjectCode")
          .sort({ examDate: 1 }),
      ]);
    } else if (subjectIds.length > 0) {
      // No class on profile: still show upcoming exams for the student's subjects.
      [upcomingExams, upcomingTimetableRows] = await Promise.all([
        Exam.find({
          subject: { $in: subjectIds },
          examDate: { $gte: today },
          isActive: { $ne: false },
        })
          .populate("subject", "subjectName subjectCode")
          .sort({ examDate: 1 })
          .limit(30),
        ExamTimetable.find({
          subject: { $in: subjectIds },
          examDate: { $gte: today },
        })
          .populate("subject", "subjectName subjectCode")
          .sort({ examDate: 1 })
          .limit(30),
      ]);
    } else {
      return res.status(200).json({
        message:
          "No class or subjects are linked to your profile yet. Ask an admin to assign your class and subjects, then revision plans can appear here.",
        studentId: studentProfile.studentId,
        timetable: [],
      });
    }

    const merged = [];
    const seen = new Set();

    const addUnique = (item) => {
      const key = [
        String(item.examName || "")
          .trim()
          .toLowerCase(),
        String(item.subject?._id || item.subject || ""),
        new Date(item.examDate).toISOString().slice(0, 10),
      ].join("|");
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(item);
    };

    upcomingTimetableRows.forEach(addUnique);
    upcomingExams.forEach(addUnique);

    if (merged.length === 0) {
      return res.status(200).json({
        message: classDoc
          ? "No upcoming exams are scheduled for your class yet. When a teacher adds an exam or exam timetable with a future date, your revision plan will appear here."
          : "No upcoming exams found for your subjects yet. When a teacher schedules a future exam, your revision plan will appear here.",
        studentId: studentProfile.studentId,
        className: classDoc?.className,
        timetable: [],
      });
    }

    const results = await Result.find({
      student: studentProfile._id,
    }).populate({
      path: "exam",
      populate: {
        path: "subject",
        select: "subjectName subjectCode",
      },
    });

    const commerceMarks = await resolveCommerceSubjectMarks(studentProfile._id);
    const commerceBySubject = {};
    for (const item of commerceMarks.performance) {
      commerceBySubject[String(item.subject || "").toLowerCase()] = item.marks;
    }

    const timetable = merged
      .sort((a, b) => new Date(a.examDate) - new Date(b.examDate))
      .map((examLike) =>
        buildTimetableRow(examLike, results, commerceBySubject, today)
      );

    res.status(200).json({
      message: "Revision timetable generated successfully",
      studentId: studentProfile.studentId,
      className: classDoc?.className,
      timetable,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
