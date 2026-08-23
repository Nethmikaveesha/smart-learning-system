/**
 * Safely reset one user's password by email (local/admin recovery).
 * Does not change roles, data, or other accounts.
 *
 * Usage:
 *   cd backend
 *   node scripts/resetUserPassword.js ameliya@gmail.com 'Ameliya123'
 */
import dotenv from "dotenv";
import mongoose from "mongoose";

import User from "../src/models/User.js";
import { hashPassword, isBcryptHash } from "../src/utils/passwordUtils.js";
import { isValidPassword } from "../src/utils/registrationValidation.js";

dotenv.config();

async function main() {
  const email = String(process.argv[2] || "")
    .trim()
    .toLowerCase();
  const newPassword = process.argv[3] || "";

  if (!email || !newPassword) {
    console.error(
      "Usage: node scripts/resetUserPassword.js <email> <newPassword>"
    );
    process.exit(1);
  }

  if (!isValidPassword(newPassword)) {
    console.error(
      "Password must be at least 8 characters with uppercase, lowercase, and a number."
    );
    process.exit(1);
  }

  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is missing in backend/.env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const user = await User.findOne({ email });
  if (!user) {
    console.error(`No user found for email: ${email}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  if (!user.isActive) {
    console.warn(
      `Warning: ${email} is inactive. Password will still be updated; admin must re-activate to log in.`
    );
  }

  const wasLegacyPlain = !isBcryptHash(user.password);
  user.password = await hashPassword(newPassword);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  await User.updateOne(
    { _id: user._id },
    { $unset: { passwordResetToken: 1, passwordResetExpires: 1 } }
  );

  console.log(`Password updated for ${user.email} (${user.role}).`);
  if (wasLegacyPlain) {
    console.log("Previous password was not bcrypt-hashed; now upgraded.");
  }
  console.log("You can sign in with the new password.");

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message || error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
