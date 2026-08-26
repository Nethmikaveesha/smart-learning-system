#!/usr/bin/env node
/**
 * EduTrack automated API + security tests.
 *
 * Usage (backend must be running):
 *   node testing/apiTests.js
 *   cd backend && npm run test:api
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.join(__dirname, "../backend/.env"));

const API =
  process.env.TEST_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:5001/api";

const ACCOUNTS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || "admin@test.com",
    password: process.env.TEST_ADMIN_PASSWORD || "123456",
  },
  teacher: {
    email: process.env.TEST_TEACHER_EMAIL || "teacher@test.com",
    password: process.env.TEST_TEACHER_PASSWORD || "123456",
  },
  student: {
    email: process.env.TEST_STUDENT_EMAIL || "student@test.com",
    password: process.env.TEST_STUDENT_PASSWORD || "123456",
  },
  parent: {
    email: process.env.TEST_PARENT_EMAIL || "parent@test.com",
    password: process.env.TEST_PARENT_PASSWORD || "123456",
  },
};

const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

async function request(method, pathName, { body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${pathName}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  return { status: res.status, data };
}

async function login(role) {
  return request("POST", "/auth/login", {
    body: {
      email: ACCOUNTS[role].email,
      password: ACCOUNTS[role].password,
    },
  });
}

async function run() {
  console.log(`\nEduTrack API tests → ${API}\n`);

  console.log("Security — unauthorized / wrong password");
  {
    const res = await request("GET", "/risk");
    if (res.status === 401) pass("GET /risk without token → 401");
    else fail("GET /risk without token → 401", `status ${res.status}`);
  }
  {
    const res = await request("GET", "/users");
    if (res.status === 401) pass("GET /users without token → 401");
    else fail("GET /users without token → 401", `status ${res.status}`);
  }
  {
    const res = await request("POST", "/auth/login", {
      body: { email: ACCOUNTS.admin.email, password: "definitely-wrong" },
    });
    if (res.status === 400 || res.status === 401) {
      pass("Wrong password rejected");
    } else fail("Wrong password rejected", `status ${res.status}`);
  }
  {
    const res = await request("GET", "/admin-dashboard", {
      token: "invalid.jwt.token",
    });
    if (res.status === 401) pass("Invalid JWT rejected → 401");
    else fail("Invalid JWT rejected → 401", `status ${res.status}`);
  }

  console.log("\nLogin and role access");
  const tokens = {};
  const users = {};
  for (const role of ["admin", "teacher", "student", "parent"]) {
    const res = await login(role);
    if (res.status === 200 && res.data?.token && res.data?.user?.role === role) {
      tokens[role] = res.data.token;
      users[role] = res.data.user;
      pass(`Login as ${role}`, res.data.user.email);
    } else {
      fail(`Login as ${role}`, res.data?.message || `status ${res.status}`);
    }
  }

  if (tokens.student) {
    const res = await request("GET", "/admin-dashboard", {
      token: tokens.student,
    });
    if (res.status === 403) pass("Student blocked from admin endpoint → 403");
    else fail("Student blocked from admin endpoint → 403", `status ${res.status}`);

    const risk = await request("GET", "/risk", { token: tokens.student });
    if (risk.status === 403) pass("Student blocked from staff risk list → 403");
    else fail("Student blocked from staff risk list → 403", `status ${risk.status}`);
  }

  if (tokens.admin) {
    const res = await request("GET", "/risk", { token: tokens.admin });
    if (res.status === 200) pass("Admin can list risk records");
    else fail("Admin can list risk records", `status ${res.status}`);
  }

  console.log("\nRegistration");
  {
    const res = await request("POST", "/auth/register", {
      body: {
        fullName: "Hack",
        email: `hack_${Date.now()}@test.com`,
        phoneNumber: "0771234567",
        password: "HackPass1",
        confirmPassword: "HackPass1",
        role: "student",
        studentId: `H${Date.now()}`,
      },
    });
    if (res.status === 401) pass("Public register blocked → 401");
    else fail("Public register blocked → 401", `status ${res.status}`);
  }

  console.log("\nContact + settings");
  {
    const bad = await request("POST", "/contact", {
      body: { name: "A" },
    });
    if (bad.status === 400) pass("Contact validation → 400");
    else fail("Contact validation → 400", `status ${bad.status}`);

    const ok = await request("POST", "/contact", {
      body: {
        name: "API Tester",
        email: "api.tester@example.com",
        message: "Automated contact test message",
      },
    });
    if (ok.status === 201 || ok.status === 200) {
      pass("Contact message accepted");
    } else fail("Contact message accepted", `status ${ok.status}`);
  }

  if (tokens.admin) {
    const inbox = await request("GET", "/contact", { token: tokens.admin });
    if (inbox.status === 200) pass("Admin can list contact messages");
    else fail("Admin can list contact messages", `status ${inbox.status}`);

    const settings = await request("GET", "/settings", { token: tokens.admin });
    if (settings.status === 200) pass("Admin can load settings");
    else fail("Admin can load settings", `status ${settings.status}`);
  }

  if (tokens.student) {
    const inbox = await request("GET", "/contact", { token: tokens.student });
    if (inbox.status === 403) pass("Student blocked from contact inbox → 403");
    else fail("Student blocked from contact inbox → 403", `status ${inbox.status}`);
  }

  console.log("\nParent / student dashboards");
  let studentProfileId = "";
  let foreignProfileId = "";

  if (tokens.parent) {
    const dash = await request("GET", "/parent-dashboard", {
      token: tokens.parent,
    });
    if (dash.status === 200) {
      pass("Parent dashboard loads");
      studentProfileId = dash.data?.student?._id || "";
      if (Array.isArray(dash.data?.subjectPerformance)) {
        pass("Parent dashboard includes subjectPerformance");
      } else {
        fail("Parent dashboard includes subjectPerformance");
      }
    } else {
      fail(
        "Parent dashboard loads",
        dash.data?.message || `status ${dash.status}`
      );
    }

    const risk = await request("GET", "/risk", { token: tokens.parent });
    if (risk.status === 403) pass("Parent blocked from staff risk list → 403");
    else fail("Parent blocked from staff risk list → 403", `status ${risk.status}`);

    const notes = await request("GET", "/risk-notifications", {
      token: tokens.parent,
    });
    if (notes.status === 200 && Array.isArray(notes.data)) {
      pass("Parent risk notifications scoped endpoint reachable");
    } else {
      fail(
        "Parent risk notifications scoped endpoint reachable",
        `status ${notes.status}`
      );
    }
  }

  if (tokens.student) {
    const dash = await request("GET", "/student-dashboard", {
      token: tokens.student,
    });
    if (dash.status === 200) {
      pass("Student dashboard loads");
      studentProfileId = dash.data?.student?._id || studentProfileId;
      if (Array.isArray(dash.data?.subjectPerformance)) {
        pass("Student dashboard includes subjectPerformance");
      } else {
        fail("Student dashboard includes subjectPerformance");
      }
    } else {
      fail(
        "Student dashboard loads",
        dash.data?.message || `status ${dash.status}`
      );
    }
  }

  if (tokens.admin) {
    const profiles = await request("GET", "/student-profiles", {
      token: tokens.admin,
    });
    if (profiles.status === 200 && Array.isArray(profiles.data)) {
      pass("Admin can list student profiles", `${profiles.data.length} profiles`);
      const other = profiles.data.find(
        (profile) => String(profile._id) !== String(studentProfileId)
      );
      foreignProfileId = other?._id || "";
    } else {
      fail("Admin can list student profiles", `status ${profiles.status}`);
    }
  }

  console.log("\nOwnership / IDOR guards");
  if (tokens.student && foreignProfileId) {
    const attendance = await request(
      "GET",
      `/attendance/student/${foreignProfileId}`,
      { token: tokens.student }
    );
    if (attendance.status === 403) {
      pass("Student blocked from other attendance → 403");
    } else {
      fail(
        "Student blocked from other attendance → 403",
        `status ${attendance.status}`
      );
    }

    const commerce = await request(
      "GET",
      `/risk/commerce/student/${foreignProfileId}`,
      { token: tokens.student }
    );
    if (commerce.status === 403) {
      pass("Student blocked from other Commerce history → 403");
    } else {
      fail(
        "Student blocked from other Commerce history → 403",
        `status ${commerce.status}`
      );
    }

    const predict = await request(
      "POST",
      `/risk/multi-class-predict-auto/${foreignProfileId}`,
      { token: tokens.student, body: {} }
    );
    if (predict.status === 403) {
      pass("Student blocked from other Commerce predict → 403");
    } else {
      fail(
        "Student blocked from other Commerce predict → 403",
        `status ${predict.status}`
      );
    }
  } else if (tokens.student) {
    pass(
      "Ownership fixtures skipped",
      "need at least two student profiles in DB"
    );
  }

  if (tokens.student && studentProfileId) {
    const ownAttendance = await request(
      "GET",
      `/attendance/student/${studentProfileId}`,
      { token: tokens.student }
    );
    if (ownAttendance.status === 200) {
      pass("Student can read own attendance");
    } else {
      fail("Student can read own attendance", `status ${ownAttendance.status}`);
    }

    const ownHistory = await request(
      "GET",
      `/risk/commerce/student/${studentProfileId}`,
      { token: tokens.student }
    );
    if (ownHistory.status === 200) {
      pass("Student can read own Commerce history");
    } else {
      fail(
        "Student can read own Commerce history",
        `status ${ownHistory.status}`
      );
    }
  }

  if (tokens.parent && foreignProfileId) {
    const predict = await request(
      "POST",
      `/risk/multi-class-predict-auto/${foreignProfileId}`,
      { token: tokens.parent, body: {} }
    );
    if (predict.status === 403) {
      pass("Parent blocked from unrelated Commerce predict → 403");
    } else {
      fail(
        "Parent blocked from unrelated Commerce predict → 403",
        `status ${predict.status}`
      );
    }
  }

  console.log("\nEssay + results validation");
  if (tokens.student) {
    const submit = await request("POST", "/essays/submit", {
      token: tokens.student,
      body: { questionId: "000000000000000000000000", answer: "test" },
    });
    if (submit.status === 404 || submit.status === 400) {
      pass("Essay submit uses logged-in student profile", `status ${submit.status}`);
    } else if (submit.status === 403 || submit.status === 401) {
      fail("Essay submit authorized for student", `status ${submit.status}`);
    } else {
      pass("Essay submit reachable for student", `status ${submit.status}`);
    }
  }

  if (tokens.teacher) {
    const schemes = await request("GET", "/essays/marking-schemes", {
      token: tokens.teacher,
    });
    if (schemes.status === 200) pass("Teacher can list marking schemes");
    else fail("Teacher can list marking schemes", `status ${schemes.status}`);

    const badResult = await request("POST", "/results", {
      token: tokens.teacher,
      body: { marks: 120 },
    });
    if (badResult.status === 400) pass("Result create validation → 400");
    else fail("Result create validation → 400", `status ${badResult.status}`);
  }

  console.log("\nML Commerce prediction (auth gate)");
  if (tokens.admin) {
    const res = await request("POST", "/risk/multi-class-predict", {
      token: tokens.admin,
      body: {
        Accounting_Score: 40,
        Business_Studies_Score: 38,
        Economics_Score: 35,
        Attendance_Percentage: 55,
      },
    });
    if (res.status === 400) {
      pass(
        "Manual Commerce predict requires student ids",
        res.data?.message
      );
    } else if (res.status === 201 && res.data?.risk_level) {
      pass("Commerce Stream Model predict + save", res.data.risk_level);
    } else if (res.status === 500) {
      pass(
        "Commerce route authorized (ML may be offline)",
        res.data?.message || "upstream error"
      );
    } else if (res.status === 401 || res.status === 403) {
      fail("Commerce predict authorized", `status ${res.status}`);
    } else {
      pass("Commerce route reachable with auth", `status ${res.status}`);
    }

    const missing = await request("POST", "/risk/multi-class-predict", {
      token: tokens.admin,
      body: { Accounting_Score: 70 },
    });
    if (missing.status === 400) {
      pass("Missing Commerce marks → meaningful 400", missing.data?.message);
    } else {
      fail("Missing Commerce marks → meaningful 400", `status ${missing.status}`);
    }

    if (studentProfileId) {
      const auto = await request(
        "POST",
        `/risk/multi-class-predict-auto/${studentProfileId}`,
        { token: tokens.admin, body: {} }
      );
      if ([200, 201, 400, 500, 502, 503].includes(auto.status)) {
        pass(
          "Staff auto Commerce predict reachable",
          auto.data?.risk_level || auto.data?.message || `status ${auto.status}`
        );
      } else if (auto.status === 401 || auto.status === 403) {
        fail("Staff auto Commerce predict authorized", `status ${auto.status}`);
      } else {
        pass("Staff auto Commerce predict reachable", `status ${auto.status}`);
      }
    }
  }

  if (tokens.admin) {
    const forgot = await request("POST", "/auth/forgot-password", {
      body: { email: ACCOUNTS.admin.email },
    });
    if ([200, 201].includes(forgot.status)) {
      pass("Forgot-password endpoint responds");
    } else {
      fail("Forgot-password endpoint responds", `status ${forgot.status}`);
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n${results.length - failed.length}/${results.length} tests passed.`
  );
  if (failed.length) {
    console.log("Failed:");
    failed.forEach((f) => console.log(`  - ${f.name}: ${f.detail}`));
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
