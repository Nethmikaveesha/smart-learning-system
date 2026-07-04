import { runDatabaseBackup } from "../jobs/databaseBackupJob.js";

export const createBackup = async (req, res) => {
  try {
    const result = await runDatabaseBackup();

    res.status(200).json({
      success: true,
      message: "Database backup created successfully",
      backup: {
        fileName: result.fileName,
        createdAt: result.createdAt,
        metadata: result.metadata,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database backup failed",
      error: error.message,
    });
  }
};