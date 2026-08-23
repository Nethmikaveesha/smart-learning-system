import bcrypt from "bcryptjs";

/** bcrypt hashes start with $2a$ / $2b$ / $2y$ */
export function isBcryptHash(value) {
  return typeof value === "string" && /^\$2[aby]\$\d{2}\$/.test(value);
}

/**
 * Verify a login password against the stored value.
 * If an older record stored a plain-text password, accept it once and
 * re-hash in place so future logins use bcrypt only.
 * Does not weaken bcrypt-protected accounts.
 */
export async function verifyPassword(user, plainPassword) {
  if (!user?.password || plainPassword == null || plainPassword === "") {
    return false;
  }

  if (isBcryptHash(user.password)) {
    return bcrypt.compare(plainPassword, user.password);
  }

  // Legacy / manually inserted plain-text password
  if (user.password !== plainPassword) {
    return false;
  }

  user.password = await bcrypt.hash(plainPassword, 10);
  await user.save();
  return true;
}

export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, 10);
}
