#!/usr/bin/env node
/**
 * EduTrack unit tests — grading, registration validation, and grade-level helpers.
 * These tests import existing utilities only. They do not start the server,
 * connect to MongoDB, or modify application source.
 *
 * Usage (from repository root):
 *   node testing/unit-tests.mjs
 */

import {
  calculateGrade,
  isPassingMark,
  formatMarks,
  formatRank,
  DEFAULT_PASS_MARK,
} from "../backend/src/utils/grading.js";
import { validateRegistrationInput } from "../backend/src/utils/registrationValidation.js";
import {
  inferGradeLevel,
  normalizeGradeLevel,
} from "../backend/src/utils/gradeLevel.js";
import {
  isValidEmail,
  isValidPassword,
  validateRegistrationForm,
} from "../frontend/src/utils/registrationValidation.js";

const results = [];

function assertEqual(actual, expected, message) {
  const ok = Object.is(actual, expected) || actual === expected;
  if (!ok) {
    throw new Error(
      `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

function assertTrue(value, message) {
  if (!value) {
    throw new Error(message);
  }
}

function run(name, fn) {
  try {
    fn();
    results.push({ name, ok: true, detail: "" });
    console.log(`  PASS  ${name}`);
  } catch (error) {
    results.push({ name, ok: false, detail: error.message });
    console.log(`  FAIL  ${name}`);
    console.log(`        ${error.message}`);
  }
}

console.log("EduTrack unit tests\n");

run("UT-01 calculateGrade returns A for marks of 75 and above", () => {
  assertEqual(calculateGrade(75), "A", "75 should be A");
  assertEqual(calculateGrade(100), "A", "100 should be A");
});

run("UT-02 calculateGrade returns B for marks from 65 to 74", () => {
  assertEqual(calculateGrade(65), "B", "65 should be B");
  assertEqual(calculateGrade(74), "B", "74 should be B");
});

run("UT-03 calculateGrade returns C for marks from 55 to 64", () => {
  assertEqual(calculateGrade(55), "C", "55 should be C");
  assertEqual(calculateGrade(64), "C", "64 should be C");
});

run("UT-04 calculateGrade returns S at the default pass mark", () => {
  assertEqual(DEFAULT_PASS_MARK, 40, "default pass mark should be 40");
  assertEqual(calculateGrade(40), "S", "40 should be S");
  assertEqual(calculateGrade(54), "S", "54 should be S");
});

run("UT-05 calculateGrade returns F below the pass mark", () => {
  assertEqual(calculateGrade(39), "F", "39 should be F");
  assertEqual(calculateGrade(0), "F", "0 should be F");
});

run("UT-06 calculateGrade respects a custom pass mark of 50", () => {
  assertEqual(calculateGrade(50, 50), "S", "50 with passMark 50 should be S");
  assertEqual(calculateGrade(49, 50), "F", "49 with passMark 50 should be F");
});

run("UT-07 isPassingMark, formatMarks and formatRank helpers", () => {
  assertTrue(isPassingMark(40) === true, "40 should pass at default pass mark");
  assertTrue(isPassingMark(39) === false, "39 should fail at default pass mark");
  assertEqual(formatMarks(72), "72.00", "marks should format to two decimals");
  assertEqual(formatMarks(null), "0.00", "missing marks should format as 0.00");
  assertEqual(formatRank(1), 1, "rank 1 should remain numeric");
  assertEqual(formatRank(0), "N/A", "rank 0 should display as N/A");
});

run("UT-08 registration validation accepts a complete valid record", () => {
  const error = validateRegistrationInput({
    fullName: "Nimal Perera",
    email: "nimal@school.lk",
    phoneNumber: "0771234567",
    password: "Password1",
    confirmPassword: "Password1",
  });
  assertEqual(error, null, "valid input should return null");
});

run("UT-09 registration validation rejects invalid email and mismatched passwords", () => {
  const emailError = validateRegistrationInput({
    fullName: "Nimal Perera",
    email: "not-an-email",
    phoneNumber: "0771234567",
    password: "Password1",
    confirmPassword: "Password1",
  });
  assertEqual(emailError, "Enter a valid email address", "invalid email");

  const mismatchError = validateRegistrationInput({
    fullName: "Nimal Perera",
    email: "nimal@school.lk",
    phoneNumber: "0771234567",
    password: "Password1",
    confirmPassword: "Password2",
  });
  assertEqual(
    mismatchError,
    "Password and confirm password do not match",
    "password mismatch"
  );
});

run("UT-10 frontend email and password rules match the backend policy", () => {
  assertTrue(isValidEmail("parent@school.lk") === true, "valid email");
  assertTrue(isValidEmail("bad-email") === false, "invalid email");
  assertTrue(isValidPassword("Password1") === true, "valid password");
  assertTrue(isValidPassword("short") === false, "password too short");
  assertTrue(isValidPassword("nouppercase1") === false, "missing uppercase");

  const studentErrors = validateRegistrationForm(
    {
      fullName: "Amal",
      email: "amal@school.lk",
      phoneNumber: "0771234567",
      password: "Password1",
      confirmPassword: "Password1",
    },
    "student"
  );
  assertTrue(
    Object.prototype.hasOwnProperty.call(studentErrors, "studentId"),
    "student role requires studentId"
  );
});

run("UT-11 grade-level helpers infer 12/13 from class names", () => {
  assertEqual(inferGradeLevel("13 Commerce A"), 13, "13 from class name");
  assertEqual(inferGradeLevel("12 Commerce B"), 12, "12 from class name");
  assertEqual(inferGradeLevel("Commerce A"), null, "no grade in name");
  assertEqual(normalizeGradeLevel(13, "Commerce A"), 13, "explicit 13");
  assertEqual(normalizeGradeLevel("x", "12 Commerce A"), 12, "fallback to class name");
});

const passed = results.filter((item) => item.ok).length;
const failed = results.filter((item) => item.ok === false).length;

console.log("\n────────────────────────────");
console.log(`Results: ${passed}/${results.length} passed`);
if (failed > 0) {
  console.log(`Failed: ${failed}`);
}
console.log("────────────────────────────\n");

process.exit(failed > 0 ? 1 : 0);
