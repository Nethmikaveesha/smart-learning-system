const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(?:\+94|94|0)?7[0-9]{8}$/;

export function normalizePhoneNumber(phoneNumber = "") {
  return phoneNumber.replace(/[\s-]/g, "");
}

export function isValidEmail(email) {
  return EMAIL_REGEX.test(String(email || "").trim());
}

export function isValidPhoneNumber(phoneNumber) {
  const normalized = normalizePhoneNumber(phoneNumber);
  return PHONE_REGEX.test(normalized);
}

export function getPasswordChecks(password = "") {
  return {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };
}

export function isValidPassword(password) {
  const checks = getPasswordChecks(password);
  return (
    checks.minLength && checks.uppercase && checks.lowercase && checks.number
  );
}

export function getPasswordStrength(password = "") {
  const checks = getPasswordChecks(password);

  if (!password) {
    return { label: "", tone: "neutral", checks };
  }

  const passedChecks = Object.values(checks).filter(Boolean).length;

  if (!isValidPassword(password)) {
    return { label: "Weak", tone: "weak", checks };
  }

  if (password.length >= 12 && passedChecks === 4) {
    return { label: "Strong", tone: "strong", checks };
  }

  if (password.length >= 10) {
    return { label: "Good", tone: "good", checks };
  }

  return { label: "Fair", tone: "fair", checks };
}

export function validateRegistrationForm(values, role) {
  const errors = {};

  if (!values.fullName?.trim()) {
    errors.fullName = "Full name is required";
  }

  if (!values.email?.trim()) {
    errors.email = "Email is required";
  } else if (!isValidEmail(values.email)) {
    errors.email = "Enter a valid email address";
  }

  if (!values.phoneNumber?.trim()) {
    errors.phoneNumber = "Phone number is required";
  } else if (!isValidPhoneNumber(values.phoneNumber)) {
    errors.phoneNumber = "Enter a valid phone number (e.g. 0771234567)";
  }

  if (!values.password) {
    errors.password = "Password is required";
  } else if (!isValidPassword(values.password)) {
    errors.password =
      "Password must be at least 8 characters with uppercase, lowercase, and a number";
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Confirm password is required";
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = "Password and confirm password do not match";
  }

  if (role === "teacher" && !values.teacherId?.trim()) {
    errors.teacherId = "Teacher ID is required";
  }

  if (role === "student" && !values.studentId?.trim()) {
    errors.studentId = "Student ID is required";
  }

  if (role === "parent") {
    if (!values.parentId?.trim()) {
      errors.parentId = "Parent ID is required";
    }
    if (!values.relationship?.trim()) {
      errors.relationship = "Relationship is required";
    }
  }

  return errors;
}
