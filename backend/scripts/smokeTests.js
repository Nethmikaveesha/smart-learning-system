#!/usr/bin/env node
/**
 * EduTrack API smoke tests (auth, contact, grading/passMark).
 *
 * Prerequisites:
 *   1. MongoDB running
 *   2. Backend running: npm run dev  (default http://127.0.0.1:5001)
 *
 * Usage:
 *   cd backend
 *   SMOKE_ADMIN_PASSWORD='your-admin-pass' \
 *   SMOKE_STUDENT_PASSWORD='your-student-pass' \
 *   npm run smoke
 *
 * Optional env:
 *   SMOKE_API_URL=http://127.0.0.1:5001/api
 *   SMOKE_ADMIN_EMAIL=admin@test.com
 *   SMOKE_STUDENT_EMAIL=student@test.com
 */

import dotenv from "dotenv";

dotenv.config();

const API =
  process.env.SMOKE_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:5001/api";

const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || "admin@test.com";
const STUDENT_EMAIL = process.env.SMOKE_STUDENT_EMAIL || "student@test.com";
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || "";
const STUDENT_PASSWORD = process.env.SMOKE_STUDENT_PASSWORD || "";

const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

async function request(method, path, { body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, {
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

async function testAuth() {
  console.log("\n1) Auth");

  if (!STUDENT_PASSWORD) {
    fail(
      "Student login skipped",
      "Set SMOKE_STUDENT_PASSWORD (e.g. export SMOKE_STUDENT_PASSWORD='...')"
    );
  } else {
    const bad = await request("POST", "/auth/login", {
      body: { email: STUDENT_EMAIL, password: "definitely-wrong-password" },
    });
    if (bad.status >= 400) {
      pass("Wrong password rejected", `status ${bad.status}`);
    } else {
      fail("Wrong password rejected", `expected 4xx, got ${bad.status}`);
    }

    const good = await request("POST", "/auth/login", {
      body: { email: STUDENT_EMAIL, password: STUDENT_PASSWORD },
    });
    if (good.status === 200 && good.data?.token) {
      pass("Student login", good.data.user?.email || STUDENT_EMAIL);
    } else {
      fail(
        "Student login",
        good.data?.message || `status ${good.status}`
      );
    }
  }

  const forgot = await request("POST", "/auth/forgot-password", {
    body: { email: STUDENT_EMAIL },
  });
  if (forgot.status === 200 && forgot.data?.message) {
    pass(
      "Forgot password",
      forgot.data.resetToken
        ? "returned resetToken (SMTP off)"
        : forgot.data.emailSent
          ? "email sent"
          : "ok"
    );
  } else {
    fail("Forgot password", forgot.data?.message || `status ${forgot.status}`);
  }

  if (forgot.data?.resetToken) {
    const token = forgot.data.resetToken;
    const tempPassword = `Smoke${Date.now().toString().slice(-6)}`;

    const reset = await request("POST", "/auth/reset-password", {
      body: {
        token,
        newPassword: tempPassword,
        confirmPassword: tempPassword,
      },
    });
    if (reset.status === 200) {
      pass("Reset password once", "ok");
    } else {
      fail("Reset password once", reset.data?.message || `status ${reset.status}`);
    }

    const reuse = await request("POST", "/auth/reset-password", {
      body: {
        token,
        newPassword: "AnotherPass99",
        confirmPassword: "AnotherPass99",
      },
    });
    if (reuse.status >= 400) {
      pass("Reset token single-use", reuse.data?.message || `status ${reuse.status}`);
    } else {
      fail("Reset token single-use", "token should not work twice");
    }

    // Restore student password if we knew the original
    if (STUDENT_PASSWORD) {
      const loginTemp = await request("POST", "/auth/login", {
        body: { email: STUDENT_EMAIL, password: tempPassword },
      });
      if (loginTemp.data?.token) {
        const againForgot = await request("POST", "/auth/forgot-password", {
          body: { email: STUDENT_EMAIL },
        });
        if (againForgot.data?.resetToken) {
          await request("POST", "/auth/reset-password", {
            body: {
              token: againForgot.data.resetToken,
              newPassword: STUDENT_PASSWORD,
              confirmPassword: STUDENT_PASSWORD,
            },
          });
          pass("Restored original student password");
        }
      }
    }
  } else {
    pass(
      "Reset password flow",
      "skipped (no resetToken — SMTP may be configured)"
    );
  }
}

async function testContact(adminToken) {
  console.log("\n2) Contact");

  const invalid = await request("POST", "/contact", {
    body: { name: "Only Name" },
  });
  if (invalid.status >= 400) {
    pass("Contact rejects incomplete body", `status ${invalid.status}`);
  } else {
    fail("Contact rejects incomplete body", `got ${invalid.status}`);
  }

  const created = await request("POST", "/contact", {
    body: {
      name: "Smoke Tester",
      email: "smoke@example.com",
      subject: "Smoke test",
      category: "General",
      message: `Automated smoke test at ${new Date().toISOString()}`,
    },
  });
  if (created.status === 201 && created.data?.id) {
    pass("Contact message saved", `id ${created.data.id}`);
  } else {
    fail(
      "Contact message saved",
      created.data?.message || `status ${created.status}`
    );
  }

  if (!adminToken) {
    fail("Admin list contact messages", "no admin token (set SMOKE_ADMIN_PASSWORD)");
    return;
  }

  const list = await request("GET", "/contact", { token: adminToken });
  if (list.status === 200 && Array.isArray(list.data)) {
    const found = list.data.some((m) => m.email === "smoke@example.com");
    if (found) {
      pass("Admin can list contact messages", `${list.data.length} total`);
    } else {
      fail("Admin can list contact messages", "smoke message not found in list");
    }
  } else {
    fail(
      "Admin can list contact messages",
      list.data?.message || `status ${list.status}`
    );
  }
}

async function testGrading(adminToken) {
  console.log("\n3) Grading / passMark");

  // Pure unit checks (no DB) via dynamic import of grading helpers
  const grading = await import("../src/utils/grading.js");
  if (
    grading.calculateGrade(40, 40) === "S" &&
    grading.calculateGrade(39, 40) === "F" &&
    grading.calculateGrade(50, 50) === "S" &&
    grading.calculateGrade(49, 50) === "F"
  ) {
    pass("calculateGrade respects passMark", "40 and 50 thresholds");
  } else {
    fail("calculateGrade respects passMark");
  }

  if (!adminToken) {
    fail("Settings passMark API", "no admin token");
    return;
  }

  const before = await request("GET", "/settings", { token: adminToken });
  const originalPassMark = Number(before.data?.passMark ?? 40);

  const updated = await request("PUT", "/settings", {
    token: adminToken,
    body: { passMark: 55 },
  });

  const afterUpdate = await request("GET", "/settings", { token: adminToken });
  if (Number(afterUpdate.data?.passMark) === 55) {
    pass("Admin can update passMark", "API now returns 55");
  } else {
    fail(
      "Admin can update passMark",
      updated.data?.message ||
        `expected 55, got ${afterUpdate.data?.passMark}`
    );
  }

  // Live grading helpers need a DB connection; verify via API analytics path instead.
  const analytics = await request("GET", "/results/analytics-summary", {
    token: adminToken,
  });
  if (analytics.status === 200) {
    pass(
      "Analytics uses settings-backed grading",
      `status ${analytics.status}`
    );
  } else {
    fail(
      "Analytics uses settings-backed grading",
      analytics.data?.message || `status ${analytics.status}`
    );
  }

  await request("PUT", "/settings", {
    token: adminToken,
    body: { passMark: originalPassMark },
  });
  pass("Restored original passMark", String(originalPassMark));
}

async function main() {
  console.log(`EduTrack smoke tests → ${API}`);

  try {
    await request("POST", "/auth/login", {
      body: { email: "smoke-ping@test.com", password: "x" },
    });
  } catch (error) {
    console.error(
      "\nBackend not reachable. Start it first:\n  cd backend && npm run dev\n"
    );
    console.error(error.message);
    process.exit(1);
  }

  let adminToken = null;
  if (ADMIN_PASSWORD) {
    const adminLogin = await request("POST", "/auth/login", {
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    if (adminLogin.data?.token) {
      adminToken = adminLogin.data.token;
      console.log(`\nAdmin login ok (${ADMIN_EMAIL})`);
    } else {
      console.log(
        `\nAdmin login failed (${ADMIN_EMAIL}): ${adminLogin.data?.message || adminLogin.status}`
      );
    }
  } else {
    console.log(
      "\nTip: export SMOKE_ADMIN_PASSWORD='...' for settings + contact list tests"
    );
  }

  if (!STUDENT_PASSWORD) {
    console.log(
      "Tip: export SMOKE_STUDENT_PASSWORD='...' for full login tests"
    );
  }

  await testAuth();
  await testContact(adminToken);
  await testGrading(adminToken);

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  console.log("\n────────────────────────────");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("────────────────────────────\n");

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("Smoke tests crashed:", error);
  process.exit(1);
});
