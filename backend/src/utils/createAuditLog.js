import AuditLog from "../models/AuditLog.js";

export const createAuditLog = async ({
  userId,
  action,
  module,
  description,
}) => {
  try {
    await AuditLog.create({
      user: userId,
      action,
      module,
      description,
    });
  } catch (error) {
    console.log("Audit Log Error:", error.message);
  }
};