const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(?:\+94|94|0)?7[0-9]{8}$/;

function normalizePhoneNumber(phoneNumber = "") {
  return phoneNumber.replace(/[\s-]/g, "");
}

function isValidPassword(password = "") {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

export function validateRegistrationInput({
  fullName,
  email,
  phoneNumber,
  password,
  confirmPassword,
}) {
  if (!fullName?.trim()) {
    return "Full name is required";
  }

  if (!email?.trim()) {
    return "Email is required";
  }

  if (!EMAIL_REGEX.test(email.trim())) {
    return "Enter a valid email address";
  }

  if (!phoneNumber?.trim()) {
    return "Phone number is required";
  }

  if (!PHONE_REGEX.test(normalizePhoneNumber(phoneNumber))) {
    return "Enter a valid phone number (e.g. 0771234567)";
  }

  if (!password) {
    return "Password is required";
  }

  if (!isValidPassword(password)) {
    return "Password must be at least 8 characters with uppercase, lowercase, and a number";
  }

  if (!confirmPassword) {
    return "Confirm password is required";
  }

  if (password !== confirmPassword) {
    return "Password and confirm password do not match";
  }

  return null;
}
