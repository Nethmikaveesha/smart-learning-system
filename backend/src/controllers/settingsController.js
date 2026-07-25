import SystemSettings from "../models/SystemSettings.js";
import { createAuditLog } from "../utils/createAuditLog.js";
import { clearPassMarkCache } from "../utils/grading.js";

const DEFAULT_SETTINGS = {
  schoolName: "EduTrack Smart Learning System",
  academicYear: String(new Date().getFullYear()),
  passMark: 40,
  supportEmail: "admin@edutrack.lk",
  timezone: "Asia/Colombo",
};

async function getOrCreateSettings() {
  let settings = await SystemSettings.findOne();

  if (!settings) {
    settings = await SystemSettings.create(DEFAULT_SETTINGS);
  }

  return settings;
}

export const getSystemSettings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSystemSettings = async (req, res) => {
  try {
    const {
      schoolName,
      academicYear,
      passMark,
      supportEmail,
      timezone,
    } = req.body;

    const settings = await getOrCreateSettings();

    if (schoolName !== undefined) settings.schoolName = String(schoolName).trim();
    if (academicYear !== undefined) {
      settings.academicYear = String(academicYear).trim();
    }
    if (passMark !== undefined && passMark !== "") {
      const numericPassMark = Number(passMark);
      if (Number.isNaN(numericPassMark) || numericPassMark < 0 || numericPassMark > 100) {
        return res.status(400).json({
          message: "passMark must be a number between 0 and 100",
        });
      }
      settings.passMark = numericPassMark;
    }
    if (supportEmail !== undefined) {
      settings.supportEmail = String(supportEmail).trim();
    }
    if (timezone !== undefined) settings.timezone = String(timezone).trim();

    await settings.save();
    clearPassMarkCache();

    await createAuditLog({
      userId: req.user?._id,
      action: "UPDATE",
      module: "Settings",
      description: "System settings updated",
    });

    res.status(200).json({
      message: "Settings updated successfully",
      settings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
