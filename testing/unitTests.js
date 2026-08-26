#!/usr/bin/env node
/**
 * Unit tests for grading / ranking helpers (no server required).
 *   node testing/unitTests.js
 */

import assert from "assert";
import {
  calculateGrade,
  formatRank,
  isPassingMark,
  DEFAULT_PASS_MARK,
} from "../backend/src/utils/grading.js";
import { dedupeResults } from "../backend/src/utils/studentResults.js";

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`  ✗ ${name} — ${error.message}`);
  }
}

/** Same ranking rule used by resultController: sort desc, rank = index + 1 */
function assignRanks(marks) {
  const sorted = [...marks].sort((a, b) => b - a);
  return sorted.map((mark, index) => ({ mark, rank: index + 1 }));
}

function zScore(mark, mean, stdev) {
  if (!stdev) return 0;
  return Number(((mark - mean) / stdev).toFixed(2));
}

console.log("\nUnit tests — grading & ranking\n");

test("Grade A for 75+", () => assert.strictEqual(calculateGrade(75), "A"));
test("Grade B for 65–74", () => assert.strictEqual(calculateGrade(65), "B"));
test("Grade C for 55–64", () => assert.strictEqual(calculateGrade(55), "C"));
test("Grade S at pass mark", () =>
  assert.strictEqual(calculateGrade(DEFAULT_PASS_MARK), "S"));
test("Grade F below pass mark", () =>
  assert.strictEqual(calculateGrade(DEFAULT_PASS_MARK - 1), "F"));
test("isPassingMark respects pass mark", () => {
  assert.strictEqual(isPassingMark(DEFAULT_PASS_MARK), true);
  assert.strictEqual(isPassingMark(DEFAULT_PASS_MARK - 1), false);
});
test("formatRank hides zero/invalid ranks", () => {
  assert.notStrictEqual(String(formatRank(0)), "0");
  assert.strictEqual(formatRank(1), 1);
});
test("Ranking assigns 1 to highest marks", () => {
  const ranks = assignRanks([40, 90, 70]);
  assert.strictEqual(ranks[0].mark, 90);
  assert.strictEqual(ranks[0].rank, 1);
  assert.strictEqual(ranks[2].rank, 3);
});
test("Equal marks currently get consecutive ranks (document for thesis)", () => {
  const ranks = assignRanks([80, 80, 60]);
  assert.strictEqual(ranks[0].rank, 1);
  assert.strictEqual(ranks[1].rank, 2);
});
test("Z-score positive above mean", () => {
  assert.ok(zScore(80, 60, 10) > 0);
});
test("Z-score zero at mean", () => {
  assert.strictEqual(zScore(60, 60, 10), 0);
});
test("dedupeResults keeps latest per student+subject", () => {
  const subject = { _id: "sub1", subjectName: "Accounting" };
  const rows = [
    {
      _id: "r1",
      student: "stu1",
      marks: 20,
      exam: { subject, examName: "T1 - Accounting", examDate: "2026-01-01" },
    },
    {
      _id: "r2",
      student: "stu2",
      marks: 90,
      exam: { subject, examName: "T1 - Accounting", examDate: "2026-01-01" },
    },
    {
      _id: "r3",
      student: "stu1",
      marks: 55,
      exam: { subject, examName: "T2 - Accounting", examDate: "2026-02-01" },
    },
  ];
  const deduped = dedupeResults(rows);
  assert.strictEqual(deduped.length, 2);
  const stu1 = deduped.find((row) => row.student === "stu1");
  const stu2 = deduped.find((row) => row.student === "stu2");
  assert.strictEqual(stu1.marks, 55);
  assert.strictEqual(stu2.marks, 90);
});
test("dedupeResults merges subject catalog twins by code", () => {
  const rows = [
    {
      _id: "r1",
      student: "stu1",
      marks: 40,
      exam: {
        subject: { _id: "idA", subjectCode: "ACC101", subjectName: "Accounting" },
        examName: "T1 - Accounting",
        examDate: "2026-01-01",
      },
    },
    {
      _id: "r2",
      student: "stu1",
      marks: 88,
      exam: {
        subject: { _id: "idB", subjectCode: "ACC101", subjectName: "Accounting" },
        examName: "T2 - Accounting",
        examDate: "2026-02-01",
      },
    },
  ];
  const deduped = dedupeResults(rows);
  assert.strictEqual(deduped.length, 1);
  assert.strictEqual(deduped[0].marks, 88);
});

console.log(`\n${passed}/${passed + failed} unit tests passed.`);
if (failed) process.exitCode = 1;
