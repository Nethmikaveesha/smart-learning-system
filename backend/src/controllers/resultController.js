import Result from "../models/Result.js";

const calculateGrade = (marks) => {
  if (marks >= 75) return "A";
  if (marks >= 65) return "B";
  if (marks >= 55) return "C";
  if (marks >= 35) return "S";
  return "F";
};

export const addResult = async (req, res) => {
  try {
    const { student, exam, marks } = req.body;

    const result = await Result.create({
      student,
      exam,
      marks,
      grade: calculateGrade(marks),
    });

    res.status(201).json({
      message: "Result added successfully",
      result,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getAllResults = async (req, res) => {
  try {
    const results = await Result.find()
      .populate({
        path: "student",
        populate: {
          path: "user",
          select: "fullName",
        },
      })
      .populate("exam", "examName");

    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const calculateExamAnalytics = async (req, res) => {
  try {
    const { examId } = req.params;

    const results = await Result.find({ exam: examId }).sort({ marks: -1 });

    if (results.length === 0) {
      return res.status(404).json({ message: "No results found for this exam" });
    }

    const marksArray = results.map((result) => result.marks);

    const mean =
      marksArray.reduce((sum, mark) => sum + mark, 0) / marksArray.length;

    const variance =
      marksArray.reduce((sum, mark) => sum + Math.pow(mark - mean, 2), 0) /
      marksArray.length;

    const standardDeviation = Math.sqrt(variance);

    for (let i = 0; i < results.length; i++) {
      const zScore =
        standardDeviation === 0
          ? 0
          : Number(((results[i].marks - mean) / standardDeviation).toFixed(2));

      results[i].zScore = zScore;
      results[i].rank = i + 1;

      await results[i].save();
    }

    const updatedResults = await Result.find({ exam: examId })
      .populate({
        path: "student",
        populate: {
          path: "user",
          select: "fullName",
        },
      })
      .populate("exam", "examName");

    res.status(200).json({
      message: "Exam analytics calculated successfully",
      mean: Number(mean.toFixed(2)),
      standardDeviation: Number(standardDeviation.toFixed(2)),
      results: updatedResults,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};