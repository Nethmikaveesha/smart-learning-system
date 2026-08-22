import User from "../models/User.js";

/**
 * Ensure at least one Super Admin exists after DB connect.
 * Prefers SUPER_ADMIN_EMAIL when set; otherwise promotes the oldest admin.
 * Safe no-op when a superadmin already exists or no admin users are present.
 */
export async function ensureSuperAdmin() {
  const existing = await User.exists({ role: "superadmin" });
  if (existing) return null;

  const preferredEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  let candidate = null;

  if (preferredEmail) {
    candidate = await User.findOne({
      email: preferredEmail,
      role: "admin",
    });
  }

  if (!candidate) {
    candidate = await User.findOne({ role: "admin" }).sort({ createdAt: 1 });
  }

  if (!candidate) {
    console.warn(
      "No admin users found to promote to superadmin. Create an admin account first."
    );
    return null;
  }

  candidate.role = "superadmin";
  await candidate.save();
  console.log(`Promoted ${candidate.email} to superadmin`);
  return candidate;
}
