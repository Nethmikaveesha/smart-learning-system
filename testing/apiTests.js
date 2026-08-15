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
  for (const role of ["admin", "teacher", "student", "parent"]) {
    const res = await login(role);
    if (res.status === 200 && res.data?.token && res.data?.user?.role === role) {
      tokens[role] = res.data.token;
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

  console.log("\nParent access");
  if (tokens.parent) {
    const dash = await request("GET", "/parent-dashboard", {
      token: tokens.parent,
    });
    if (dash.status === 200) pass("Parent dashboard loads");
    else fail("Parent dashboard loads", dash.data?.message || `status ${dash.status}`);

    const risk = await request("GET", "/risk", { token: tokens.parent });
    if (risk.status === 403) pass("Parent blocked from staff risk list → 403");
    else fail("Parent blocked from staff risk list → 403", `status ${risk.status}`);
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
    if (res.status === 200 && res.data?.risk_level) {
      pass("Commerce Stream Model predict + save", res.data.risk_level);
    } else if (res.status === 400) {
      pass("Commerce validation message returned", res.data?.message);
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
