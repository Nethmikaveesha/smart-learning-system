import {
  runDatabaseBackup,
  listDatabaseBackups,
  restoreDatabaseBackup,
} from "../jobs/databaseBackupJob.js";
import { createAuditLog } from "../utils/createAuditLog.js";

export const createBackup = async (req, res) => {
  try {
    const result = await runDatabaseBackup();

    await createAuditLog({
      userId: req.user?._id,
      action: "CREATE",
      module: "Database Backup",
      description: `Backup created: ${result.fileName}`,
    });

    res.status(200).json({
      success: true,
      message: `Database backup created successfully (${result.fileName})`,
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

export const listBackups = async (req, res) => {
  try {
    const backups = listDatabaseBackups();

    res.status(200).json({
      success: true,
      count: backups.length,
      backups,
      latest: backups[0] || null,
      note:
        backups.length === 0
          ? "No backups yet. Click Run Database Backup to create one."
          : `Showing ${backups.length} backup file(s) from backend/database-backups.`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to list backups",
      error: error.message,
    });
  }
};

export const restoreBackup = async (req, res) => {
  try {
    const { fileName } = req.body;

    if (!fileName) {
      return res.status(400).json({
        success: false,
        message: "fileName is required",
      });
    }

    const result = await restoreDatabaseBackup(fileName);

    await createAuditLog({
      userId: req.user?._id,
      action: "UPDATE",
      module: "Database Backup",
      description: `Backup restored: ${result.fileName}`,
    });

    res.status(200).json({
      success: true,
      message: `Database restored from ${result.fileName}`,
      restore: result,
    });
  } catch (error) {
    const status = /not found|invalid|missing/i.test(error.message) ? 400 : 500;
    res.status(status).json({
      success: false,
      message: "Database restore failed",
      error: error.message,
    });
  }
};
