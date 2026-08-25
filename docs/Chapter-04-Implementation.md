# Chapter 4 — Implementation

## 4.1 Introduction

This chapter describes how EduTrack (Smart Learning System) was implemented. The system is a school academic platform for Advanced Level (A/L) Commerce classes. It provides separate workspaces for administrators, teachers, students and parents, and it connects a MERN web application to a Python machine-learning (ML) service that estimates academic risk.

The implementation follows the design of the previous chapter. The web application manages users, classes, subjects, exams, marks, attendance, reports and role-based dashboards. The ML service scores two project models (Pass/Fail risk and Commerce multi-class risk) and one optional research benchmark (xAPI). Google Gemini is used for AI-assisted essay feedback, a Commerce chatbot, flashcards, study content and adaptive materials, with a local NLP fallback when the AI service is unavailable.

The chapter is organised as follows. Section 4.2 records the development environment and technologies. Sections 4.3–4.8 describe the React frontend, Node.js/Express backend, MongoDB collections, JWT security and the four role modules. Sections 4.9–4.12 describe AI learning functions, the Commerce-risk model, ML API integration, and the save/retrieve workflow. Sections 4.13–4.21 present the test plan, functional cases and the results that were obtained from the codebase without changing application source files.

## 4.2 Development Environment and Technologies

The project is a three-process system: a React single-page application, an Express REST API, and a Flask ML API. Table 4.1 lists the environment used for implementation.

**Table 4.1 Development environment**

| Layer | Tool / runtime | Role in the project |
| --- | --- | --- |
| Frontend | React 19, Vite 8, React Router 7 | Pages, dashboards, protected routes |
| UI | Tailwind CSS 4, Lucide icons, Recharts | Layout, icons, charts |
| HTTP client | Axios | Calls `/api/*` on the backend |
| Backend | Node.js 22, Express 5 (ES modules) | REST API, jobs, auth |
| Persistence | MongoDB with Mongoose 9 | Documents for users, academics, risk |
| Security | JSON Web Tokens, bcryptjs | Login sessions and password hashing |
| Email | Nodemailer | Password-reset mail when SMTP is configured |
| Documents | PDFKit | Monthly parent reports |
| Scheduling | node-cron | Monthly reports and database backups |
| AI | Google Gemini (`gemini-2.5-flash`) | Essay marking, chatbot, study content |
| ML API | Python 3, Flask, flask-cors | Serve trained classifiers |
| ML libraries | pandas, scikit-learn, joblib, matplotlib | Train, evaluate, export models |
| Quality checks | ESLint 10, `node --check`, `py_compile` | Lint and syntax |

Default local ports used in the implementation are:

- Frontend (Vite): `http://localhost:5173`
- Express API: `http://localhost:5001` (frontend Axios `baseURL` is `http://localhost:5001/api`)
- Flask ML API: `http://127.0.0.1:5000` (backend reads `ML_API_URL`, defaulting to this address)

MongoDB is reached through `process.env.MONGO_URI`. JWT signing uses `process.env.JWT_SECRET`. Gemini uses `process.env.GEMINI_API_KEY`. These values stay in environment files and are not stored in source control.

Root npm scripts start each part of the stack independently (`dev:frontend`, `dev:backend`, `dev:ml`, `train:ml`). This keeps a failure in the ML service from stopping login, marks entry or dashboards.

**Figure 4.1** Runtime structure of the implemented system.

```text
  Browser (React + Vite :5173)
              |
              |  HTTP JSON + Bearer JWT
              v
  Express API (:5001)  ---- MongoDB (Mongoose models)
              |
              |  axios POST  (ML_API_URL)
              v
  Flask ML API (:5000)  ---- joblib models in ml-model/models/
              |
              +-- Gemini API (essay, chatbot, study content)
```

[Insert screenshot: project folder tree in VS Code / Cursor showing `frontend/`, `backend/`, `ml-model/`.]

## 4.3 React Frontend Implementation

The frontend is a Vite React application. `main.jsx` mounts the tree. `App.jsx` wraps routes in `AuthProvider` and `BrowserRouter`. Public marketing pages use `PublicLayout`. Signed-in pages use `DashboardLayout`, which loads a role-specific sidebar (Admin, Teacher, Student, Parent).

Authentication state is held in `AuthContext`. On login the API returns a user object and a JWT. Both are written to `localStorage` (`user`, `token`). On logout they are removed. `ProtectedRoute` sends visitors to `/login` when there is no user, or when `user.role` is not in `allowedRoles`.

After a successful login, `Login.jsx` routes the user by role:

| Role | Landing route |
| --- | --- |
| admin | `/admin` |
| teacher | `/teacher` |
| student | `/student` |
| parent | `/parent` |

Public routes implemented: Home, About, Features, Contact, Privacy, Terms, Data protection, Accessibility, Login, Forgot password, Reset password.

Dashboard feature pages that are not given a dedicated component are rendered by the reusable `DashboardFeaturePage`, so sidebar links such as “Add Teacher”, “Marks Management” and “Child Overview” still open a working screen. Dedicated screens were implemented where the workflow is specialised (essay grading, topic-error analysis, adaptive learning, flashcards, performance tracker, parent risk alerts, system analytics).

Axios is configured in `frontend/src/services/api.js`. Authenticated pages attach `Authorization: Bearer <token>` on each request. Two ML helpers are exported for parent workflows:

- `predictPassFailRisk(studentProfileId, data)` → `POST /risk/final-predict-auto/:id`
- `predictCommerceRisk(studentProfileId, data)` → `POST /risk/multi-class-predict-auto/:id`

Registration helpers in `frontend/src/utils/registrationValidation.js` enforce Sri Lankan mobile numbers, email format, and a password policy of at least eight characters with upper case, lower case and a digit. The same rules exist on the backend so the browser and the API reject the same invalid input.

[Insert screenshot: Login page.]
[Insert screenshot: public Home page.]

## 4.4 Node.js / Express Backend Implementation

`backend/src/server.js` loads environment variables, connects to MongoDB, enables CORS and JSON parsing, starts cron jobs, and mounts route modules under `/api/...`. A root GET handler returns `Smart Learning System API Running`.

**Table 4.2 Principal API mounts**

| Mount | Purpose |
| --- | --- |
| `/api/auth` | Login, register (admin only), password reset |
| `/api/users` | Admin user CRUD and disable |
| `/api/classes`, `/api/subjects`, `/api/student-profiles` | Academic setup |
| `/api/exams`, `/api/exam-timetables`, `/api/results` | Assessment |
| `/api/attendance` | Daily present/absent records |
| `/api/essays` | Questions, marking schemes, AI/NLP grading, teacher review |
| `/api/chatbot` | Gemini Commerce chatbot |
| `/api/adaptive-learning`, `/api/flashcards`, `/api/content-recommendations` | Study support |
| `/api/study-planner`, `/api/badges` | Student planner and achievements |
| `/api/admin-dashboard`, `/api/teacher-dashboard`, `/api/student-dashboard`, `/api/parent-dashboard` | Role home data |
| `/api/risk` | ML prediction and stored Pass/Fail / xAPI records |
| `/api/reports`, `/api/backups`, `/api/audit-logs`, `/api/settings`, `/api/contact` | Admin operations |

Controllers sit in `backend/src/controllers`. Shared rules live in `backend/src/utils` (grading, registration, grade level 12/13, Z-score helpers, audit logging, email). Background jobs are:

- `monthlyReportJob.js` — scheduled parent PDF generation
- `databaseBackupJob.js` — scheduled JSON backups under `backend/backups/`

Pass mark is not hard-coded in live grading. `getPassMark()` reads `SystemSettings.passMark` (default 40, cached for 30 seconds). `calculateGrade(marks, passMark)` then maps scores to A / B / C / S / F, where S is a pass at or above the school pass mark and F is below it.

Role checks on routes use `protect` then `authorizeRoles(...)`. Example: only `admin` may create users; `admin` and `teacher` may add results; only `parent` may load `/api/parent-dashboard`; only `student` may load adaptive learning.

## 4.5 MongoDB Database Implementation

Mongoose models in `backend/src/models` define the collections. Connection is opened once in `config/db.js` using `mongoose.connect(process.env.MONGO_URI)`.

**Table 4.3 Implemented collections**

| Model | Main fields | Used for |
| --- | --- | --- |
| User | fullName, email, password, role, isActive, teacherId, parentId, reset token | Accounts (`admin`, `teacher`, `student`, `parent`) |
| StudentProfile | studentId, class, parent, subjects, attendancePercentage, riskStatus | One academic profile per student |
| Class | className, gradeLevel (12 or 13), stream (default Commerce), academicYear | A/L class groups |
| Subject | subjectName, subjectCode, assignedTeacher, classes | Accounting, Business Studies, Economics |
| Exam | examName, class, subject, examDate, totalMarks | Term tests |
| Result | student, exam, marks, grade, zScore, rank | Unique per student+exam |
| Attendance | student, class, date, status Present/Absent | Attendance percentage |
| EssayQuestion, MarkingScheme, EssaySubmission | question, keywords, answer, AI/NLP/teacher marks | Paper workflow |
| Flashcard, ContentRecommendation, AdaptiveStudyMaterial | subject-linked study items | AI learning tools |
| FinalRisk | studentId, inputData, passPrediction, predictedResult, riskLevel | Saved Pass/Fail ML output |
| StudentRisk | studentId, inputData, performanceClass H/M/L, riskLevel | Saved xAPI benchmark output |
| AuditLog, SystemSettings, ContactMessage, ExamTimetable | operational data | Admin control |

Passwords are stored as bcrypt hashes (cost factor 10). Reset tokens are stored as SHA-256 hashes with a one-hour expiry. Email is unique on User. Result has a unique compound index on `(student, exam)` so the same exam cannot be marked twice. Attendance status is restricted to `Present` or `Absent`. Class `gradeLevel` is restricted to 12 or 13.

Student risk status on the profile (`Low` / `Medium` / `High`) is updated when a teacher or admin saves marks. That rule-based status is separate from the ML labels (`Low Risk`, `Medium Risk`, `High Risk`) produced by Flask.

[Insert screenshot: MongoDB Compass showing Users and Results collections.]

## 4.6 JWT Authentication and Role-Based Access

### 4.6.1 Login

`POST /api/auth/login` requires email and password. The controller:

1. Rejects empty credentials with HTTP 400.
2. Looks up the user by lower-cased email.
3. Returns a generic “Invalid email or password” message when the user is missing or the bcrypt compare fails (so accounts cannot be enumerated by distinct error text).
4. Returns HTTP 403 if `isActive` is false.
5. Signs a JWT containing `{ id, role }` with `JWT_SECRET`, expiry 7 days.
6. Returns `{ token, user: { id, fullName, email, role } }`.

Only an authenticated **admin** may call `POST /api/auth/register` and `POST /api/auth/register-admin`. Students and parents cannot self-register. Forgot-password always returns a generic success message. If SMTP is not configured, a one-time `resetToken` is returned so a school demo can still complete the flow. The token cannot be reused.

### 4.6.2 Request protection

`protect` reads `Authorization: Bearer <token>`, verifies it, loads `User` without the password, and sets `req.user`. Missing or invalid tokens return HTTP 401. `authorizeRoles('admin', 'teacher', ...)` then returns HTTP 403 when `req.user.role` is not allowed.

The frontend repeats the same policy in `ProtectedRoute`. A parent JWT cannot open `/admin` even if the user types the URL. A student cannot open `/teacher`. Teachers are allowed on teacher routes; admins are also allowed on teacher routes so an administrator can inspect teaching tools.

Password change (`PUT /api/auth/change-password`) requires a valid JWT. Audit logs record create/update actions in user management, results and essays.

## 4.7 Teacher, Student, Parent and Admin Modules

### 4.7.1 Admin module

The admin workspace (`/admin`) is the school control panel. Sidebar groups are Dashboard and System Analytics; User Management (add admin/teacher/student/parent, view users, disable user); Academic Setup (classes, subjects, teacher assignments); Exam Control (exams, timetables, question-paper details, reports); and System (audit logs, contact inbox, database backup, settings).

Implemented backend support includes user CRUD, class and subject APIs, exam timetables, settings (including pass mark), contact-message listing, JSON backups, audit logs, and admin dashboard aggregates. Contact messages from the public site are stored and listed only for admins.

[Insert screenshot: Admin dashboard.]
[Insert screenshot: Add Teacher / View Users.]

### 4.7.2 Teacher module

The teacher workspace (`/teacher`) covers classes and subjects; paper workflow (create paper, question bank, marking schemes); class operations (submissions, essay review, create exam, marks, attendance); analytics (topic-error analysis, Z-scores and rankings, weak-student detection, score trends); and support (content provider, reports, notifications, profile).

Marks entry recalculates rank and Z-score for every student in that exam. Weak-student detection uses the school pass mark and attendance. Essay review lets the teacher override AI part-marks. Topic-error analysis uses stored essay topic analysis. Content provider and score-trends pages call their respective APIs with the teacher JWT.

[Insert screenshot: Teacher dashboard.]
[Insert screenshot: Marks management and essay review.]

### 4.7.3 Student module

The student workspace (`/student`) covers subjects, exam papers, answer submission (essay grader), study plan (adaptive learning), study help (chatbot), revision timetable, flashcards, study materials, performance tracker, badges, and attendance-versus-marks.

Adaptive learning builds a plan from weak exam marks (below 50) and weak essay submissions, then attaches notes, flashcards and Gemini-generated material. The chatbot is available to student, teacher and admin. Essay submission runs Gemini and local NLP, then stores a mark breakdown for teacher review.

[Insert screenshot: Student dashboard.]
[Insert screenshot: Essay grader and adaptive learning.]

### 4.7.4 Parent module

The parent workspace (`/parent`) is read-oriented. It shows child overview, marks and rankings, monthly performance, progress reports, attendance, risk alerts, and attendance versus grades. A parent may be linked to more than one child; the UI can switch `studentId`.

Risk Alerts (`/parent/risk-alerts`) is the parent-facing ML screen. It loads dashboard data, then can run Pass/Fail auto-prediction and Commerce multi-class auto-prediction for the selected child. Results are shown as risk labels rather than raw model internals.

[Insert screenshot: Parent dashboard.]
[Insert screenshot: Parent Risk Alerts with a Commerce risk result.]

## 4.8 AI-Assisted Learning Functions

AI features are implemented in `backend/src/services/geminiService.js` using `gemini-2.5-flash`. If `GEMINI_API_KEY` is missing or a call fails, each function returns a safe fallback so the page still works.

**Table 4.4 AI functions implemented**

| Function | Used by | Behaviour |
| --- | --- | --- |
| `evaluateEssayWithGemini` | Essay submission | A/L Commerce examiner prompt; JSON marks, feedback, missing points |
| `analyzeEssayTopicsWithGemini` | Essay analysis | Weak topics / missing concepts for teacher topic-error views |
| `generateAdaptiveMaterialFromErrorsWithGemini` | Adaptive learning | Extra notes from error patterns |
| `generateFlashcardsWithGemini` | Flashcards | Question–answer cards for a subject |
| `generateStudyContentWithGemini` | Content provider | Teacher/student study notes |
| `askCommerceChatbotWithGemini` | Chatbot | Accounting, Business Studies, Economics and study questions |

A second, local path exists in `nlpService.js`. It tokenises answers, drops stop words, applies light stemming, computes cosine similarity against a model answer, measures keyword coverage, and checks introduction / body / conclusion structure. The essay controller races Gemini against a timeout and still stores NLP scores, so marking is not blocked when the external API is slow.

The chatbot controller keeps rule-based answers (marketing, accounting, economics, attendance, Z-score, study plan) and uses them only when Gemini fails. The response records `source` as `"Gemini AI"` or `"Rule-Based Fallback"`.

## 4.9 Commerce-Risk Prediction Model

The Commerce-risk model is the recommended multi-class classifier for this project. It predicts one of **Low Risk**, **Medium Risk**, **High Risk** for an A/L Commerce student.

### 4.9.1 Features and target

Training is implemented in `ml-model/train_all.py` (`generate_commerce_risk`, 1,800 rows, `random_state=42`). The feature matrix is:

- `Accounting_Score`
- `Business_Studies_Score`
- `Economics_Score`
- `Attendance_Percentage`

The target is `risk_level`. `Subject_Average` is generated for analysis but **excluded** from X so the model cannot learn a trivial copy of the mean mark (data-leakage control). Labels are overlapping by design: a noisy latent score is cut at quantiles 0.37 and 0.72, so High / Medium / Low are not a deterministic function of the four inputs.

### 4.9.2 Algorithms compared

Each task compares Logistic Regression, Decision Tree and Random Forest inside a scikit-learn `Pipeline`. Numeric columns are median-imputed and standardised **inside** the pipeline so scaling is fitted on training folds only. Selection uses balanced accuracy, with macro F1 as support. The tuned Commerce model recorded in `commerce_risk_tuning_summary.json` is **Logistic Regression** with `C = 0.1`, solver `lbfgs`.

### 4.9.3 Test-set metrics (Commerce)

From `commerce_risk_best_tuned_classification_report.json` (360 test rows, 20% hold-out):

**Table 4.5 Commerce-risk classification report**

| Class | Precision | Recall | F1-score | Support |
| --- | --- | --- | --- | --- |
| High Risk | 0.77 | 0.77 | 0.77 | 101 |
| Low Risk | 0.80 | 0.78 | 0.79 | 133 |
| Medium Risk | 0.63 | 0.64 | 0.64 | 126 |
| **Accuracy** |  |  | **0.73** | 360 |
| Macro average | 0.73 | 0.73 | 0.73 | 360 |

Medium Risk is the hardest class, which is expected when class boundaries overlap. The exported pipeline is written to `multi_class_risk_model.pkl` and `multi_class_feature_columns.pkl`.

The mandatory companion model is Pass/Fail (`attendance_pct`, `homework_pct`, `midterm_score`, `study_hours_per_week` → Pass/Fail). Its tuned accuracy on the hold-out set is 0.75. The xAPI model is optional and is not required for the Commerce parent workflow.

[Insert screenshot: confusion matrix `commerce_risk_best_tuned_confusion_matrix.png` from `ml-model/outputs/figures/` after training.]

## 4.10 ML API Integration

Flask (`ml-model/app.py`) loads joblib files on demand and exposes:

| Endpoint | Model | Input | Output |
| --- | --- | --- | --- |
| `POST /predict-final-risk` | Pass/Fail | four numeric features | `pass_prediction`, `predicted_result`, `risk_level` |
| `POST /predict-multi-class-risk` | Commerce | four Commerce features | `risk_level` |
| `POST /predict-risk` | xAPI (optional) | encoded activity features | `risk_status` H/M/L |
| `GET /` | health | none | which model files are present |

Empty JSON returns HTTP 400. Missing pickle files return HTTP 503 with a message to run `python3 train_all.py`. Other errors return HTTP 500 with `success: false`. CORS is enabled so local tools can call Flask directly during research, but the production path is Express → Flask.

Express `riskRoutes.js` is the integration layer. It posts to `${ML_API_URL}` with a 10-second timeout and forwards upstream status/data when Flask fails. Auto endpoints assemble features from MongoDB instead of asking the parent to type marks.

**Table 4.6 Express ML routes**

| Express route | Flask target | Feature source |
| --- | --- | --- |
| `POST /api/risk/final-predict` | `/predict-final-risk` | Request body |
| `POST /api/risk/final-predict-auto/:studentProfileId` | `/predict-final-risk` | Latest Result + attendance (+ defaults for homework/study hours) |
| `POST /api/risk/multi-class-predict` | `/predict-multi-class-risk` | Request body |
| `POST /api/risk/multi-class-predict-auto/:studentProfileId` | `/predict-multi-class-risk` | Result subject names + Attendance counts |
| `POST /api/risk/predict` | `/predict-risk` | Request body (research) |
| `GET /api/risk/final` | — | Retrieve saved Pass/Fail documents |
| `GET /api/risk` | — | Retrieve saved xAPI documents |

Auto Commerce matching is keyword-based on the exam/subject name (`accounting`, `business`, `economics`). Attendance percentage is present-count / total-count when attendance rows exist. If a subject mark is missing, the route currently substitutes a numeric default (65 for subjects, 75 for attendance) so Flask still receives a complete vector. That behaviour is tested as a missing-data case in Section 4.18.

The research/demo page `/risk-dashboard` reads stored Pass/Fail and xAPI rows. Parent pages call the auto Commerce and Pass/Fail routes with the child profile id.

## 4.11 CommerceRisk Save / Retrieve Workflow

Three related workflows were implemented. They are separated so a failure in one model does not block the others.

### 4.11.1 Commerce prediction (live parent workflow)

This is the workflow used on Parent Dashboard and Parent Risk Alerts.

```text
Parent UI (JWT)
    |  POST /api/risk/multi-class-predict-auto/:studentProfileId
    |  body: Accounting_Score, Business_Studies_Score,
    |        Economics_Score, Attendance_Percentage
    v
Express riskRoutes
    |  1. Load StudentProfile by id  (404 if missing)
    |  2. Load latest Result rows and match Commerce subjects
    |  3. Compute attendance from Attendance collection
    |  4. Build studentData of four numeric features
    |  POST http://127.0.0.1:5000/predict-multi-class-risk
    v
Flask  ->  joblib multi_class_risk_model.pkl
    |  JSON { success, model, risk_level }
    v
Express returns JSON to the parent page
Parent UI stores the payload in React state and shows the risk label
```

The Commerce result is therefore **retrieved for display from the API response** and from the academic collections that supplied the inputs (Result, Attendance, StudentProfile). There is no separate `CommerceRisk` Mongoose model in the current codebase. Persistence of Commerce labels can be added later without changing the Flask contract; the parent UI already consumes `risk_level` from the JSON body.

### 4.11.2 Pass/Fail save and retrieve

Auto and manual Pass/Fail calls **do** persist:

1. Flask returns `pass_prediction`, `predicted_result`, `risk_level`.
2. Express `FinalRisk.create({ studentId, inputData, passPrediction, predictedResult, riskLevel })`.
3. Retrieve: `GET /api/risk/final` returns documents newest first.
4. `/risk-dashboard` loads this list into the Pass/Fail summary cards.

If no exam result exists, auto Pass/Fail returns HTTP 404 `"No exam result found for this student"` and nothing is written.

### 4.11.3 xAPI benchmark save and retrieve

Research predictions call Flask `/predict-risk`, map H/M/L to Low/Medium/High Risk, then `StudentRisk.create(...)`. Retrieve: `GET /api/risk`. This path is not the main Commerce parent flow.

**Table 4.7 What is stored where**

| Model | Saved MongoDB collection | Retrieve API | UI |
| --- | --- | --- | --- |
| Commerce multi-class | Inputs in Result / Attendance / StudentProfile; prediction returned live | Auto POST response | Parent Dashboard, Risk Alerts |
| Pass/Fail | `finalrisks` (`FinalRisk`) | `GET /api/risk/final` | Risk Dashboard |
| xAPI benchmark | `studentrisks` (`StudentRisk`) | `GET /api/risk` | Risk Dashboard |

[Insert screenshot: Risk Dashboard after a Pass/Fail save.]
[Insert screenshot: network tab showing `multi-class-predict-auto` JSON.]

## 4.12 Test Plan

Testing was planned to confirm that implemented modules behave as specified, without altering production source. The plan has four layers.

**Table 4.8 Test plan**

| Layer | Method | Environment | Purpose |
| --- | --- | --- | --- |
| Unit | `node testing/unit-tests.mjs` | No server, no MongoDB | Grading, validation, grade-level helpers |
| Syntax | `node --check`, `python3 -m py_compile` | Static | Catch parse errors before runtime |
| Lint | `npm run lint` in `frontend/` | Static | React/ESLint rules |
| Functional / API (specified cases) | Manual or smoke script against a running API | Local Express + MongoDB + Flask | Auth, roles, risk, invalid data, integration |

Entry criteria: source on the implementation branch; Node.js and Python available. Exit criteria: unit tests 11/11; JavaScript and Python syntax clean; functional cases documented with expected results from the implemented code. The application was not modified to obtain these results.

Unit tests do not require MongoDB, Express, Flask or Gemini. They import existing utilities only. API-level cases below are specified from the live controllers and can be executed when the three processes are already running; they were not used to change any system file.

## 4.13 Functional Test Cases

**Table 4.9 Core functional cases**

| ID | Module | Steps | Expected result |
| --- | --- | --- | --- |
| FT-01 | Public site | Open `/`, `/about`, `/features`, `/contact` | Pages render without login |
| FT-02 | Login | Valid student email/password | HTTP 200, JWT, redirect `/student` |
| FT-03 | Login | Wrong password | HTTP 400, no token |
| FT-04 | Inactive user | Login with `isActive: false` | HTTP 403, account inactive message |
| FT-05 | Admin register | Admin JWT + valid teacher payload | HTTP 201, role `teacher` |
| FT-06 | Self-register | No JWT on `/api/auth/register` | HTTP 401 |
| FT-07 | Add result | Teacher JWT, student + exam + marks | Grade assigned, ranks/Z-scores recalculated |
| FT-08 | Duplicate result | Same student + exam again | HTTP 400, unique combination message |
| FT-09 | Attendance | Teacher records Present/Absent | Counts feed Commerce attendance % |
| FT-10 | Essay submit | Student posts answer | Gemini and/or NLP scores stored |
| FT-11 | Chatbot | Student asks an Accounting question | Answer + `source` Gemini or fallback |
| FT-12 | Adaptive plan | Student with a mark below 50 | Subject listed with notes/flashcards |
| FT-13 | Parent child switch | Parent with two linked children | Dashboard reloads selected profile |
| FT-14 | Contact | Public POST complete body | HTTP 201; admin can list it |
| FT-15 | Contact | Incomplete body | HTTP 4xx |
| FT-16 | Backup | Admin POST `/api/backups` | JSON backup file created |
| FT-17 | Pass mark | Admin sets passMark 55 | `calculateGrade` uses 55 for S/F boundary |

## 4.14 Authentication and Authorisation Tests

**Table 4.10 AuthN / AuthZ cases**

| ID | Case | Expected |
| --- | --- | --- |
| AZ-01 | No `Authorization` header on `/api/profile` | 401 `Not authorized, no token` |
| AZ-02 | Malformed or expired JWT | 401 `Not authorized` |
| AZ-03 | Student JWT on `/api/admin/test` | 403 role not allowed |
| AZ-04 | Admin JWT on `/api/admin/test` | 200 `Admin route access granted` |
| AZ-05 | Teacher JWT on `/api/teacher/test` | 200 |
| AZ-06 | Parent JWT on `/api/teacher-dashboard` | 403 |
| AZ-07 | Parent JWT on `/api/parent-dashboard` | 200 with child payload |
| AZ-08 | Student JWT on `/api/results` POST | 403 (only admin/teacher) |
| AZ-09 | Student JWT on `/api/adaptive-learning` | Allowed |
| AZ-10 | Forgot password unknown email | 200 generic message (no account leak) |
| AZ-11 | Reset password twice with same token | Second call 4xx |
| AZ-12 | Frontend: parent session opens `/admin` | `ProtectedRoute` redirects to `/login` |
| AZ-13 | Disabled user | 403 before token issue |

These cases match `authMiddleware.js`, `authController.js`, `authRoutes.js` and `ProtectedRoute` in `App.jsx`.

## 4.15 Role-Based Dashboard Tests

**Table 4.11 Dashboard cases**

| ID | Role | Check | Expected |
| --- | --- | --- | --- |
| RB-01 | Admin | Sidebar shows Users, Classes, Backup, Settings | Only admin links |
| RB-02 | Admin | `/admin/system-analytics` | Analytics page loads with admin JWT |
| RB-03 | Teacher | Sidebar shows Papers, Marks, Topic Error Analysis | Teacher links; no “Add Admin” |
| RB-04 | Teacher | `/teacher` data API | Classes/subjects for that teacher |
| RB-05 | Student | `/student` | Own results only |
| RB-06 | Student | Open `/parent` | Redirect login |
| RB-07 | Parent | `/parent` | Linked children, marks, attendance |
| RB-08 | Parent | `/parent/risk-alerts` | Pass/Fail and Commerce action buttons |
| RB-09 | All signed-in roles except parent | `/chatbot` | Chat UI allowed for student/teacher/admin |
| RB-10 | Parent | `/chatbot` | Blocked by allowedRoles |

[Insert screenshot: four sidebars — Admin, Teacher, Student, Parent.]

## 4.16 Commerce-Risk Prediction Tests

**Table 4.12 Commerce-risk cases**

| ID | Input | Expected |
| --- | --- | --- |
| CR-01 | Flask health `GET /` | JSON lists `/predict-multi-class-risk` |
| CR-02 | Body with all four features, strong marks + high attendance | `risk_level` one of Low / Medium / High Risk |
| CR-03 | Body with low marks + low attendance | Tendency toward High Risk (not guaranteed; classes overlap) |
| CR-04 | Empty body to Flask | 400 `No input data provided` |
| CR-05 | Model files missing | 503 with train instruction |
| CR-06 | Auto route, unknown profile id | 404 `Student profile not found` |
| CR-07 | Auto route, profile with Accounting/Business/Economics results | Those marks sent to Flask, not only defaults |
| CR-08 | Parent Risk Alerts “subject progress check” | UI shows `risk_level` from `res.data` |
| CR-09 | Express timeout / Flask down | 500 `Commerce ML risk prediction failed` with `error` message |
| CR-10 | Feature order | Flask selects `multi_class_features` columns; extra JSON keys ignored |

Pass/Fail companion cases: missing latest Result → 404; successful call → `FinalRisk` document created and visible on `GET /api/risk/final`.

## 4.17 Missing Marks / Invalid-Data Tests

**Table 4.13 Invalid and missing data**

| ID | Condition | Implemented behaviour |
| --- | --- | --- |
| IV-01 | Result `marks` omitted | Mongoose `required: true` → create fails; API returns error |
| IV-02 | Result `marks` below 0 | Schema `min: 0` → validation error |
| IV-03 | Duplicate student+exam | HTTP 400 unique combination / E11000 mapped to 400 |
| IV-04 | Invalid email on register | `"Enter a valid email address"` |
| IV-05 | Weak password (`short`) | Length / complexity message |
| IV-06 | Password ≠ confirmPassword | `"Password and confirm password do not match"` |
| IV-07 | Invalid Sri Lankan mobile | `"Enter a valid phone number (e.g. 0771234567)"` |
| IV-08 | Essay `gradeLevel` not 12 or 13 | HTTP 400 |
| IV-09 | Chatbot empty question | HTTP 400 `Question is required` |
| IV-10 | Commerce auto: subject name does not contain accounting/business/economics | Code uses default score 65 for that subject |
| IV-11 | Commerce auto: no attendance rows and no profile % | Default attendance 75 |
| IV-12 | Pass/Fail auto: no Result | HTTP 404, no `FinalRisk` insert |
| IV-13 | Flask Commerce body missing a required column | HTTP 500 prediction failed (column select error) |
| IV-14 | `formatMarks(null)` in UI helpers | `"0.00"` |
| IV-15 | Rank 0 | Displayed as `"N/A"` |

IV-10 and IV-11 are important for the report: the auto Commerce path prefers real marks, then request-body overrides, then documented numeric defaults so the ML service receives a complete vector. The parent UI also sends subject marks from the dashboard when they exist.

## 4.18 API Integration Tests

**Table 4.14 Integration across Express, MongoDB and Flask**

| ID | Flow | Expected |
| --- | --- | --- |
| IT-01 | Login → JWT → `GET /api/student-dashboard` | Student payload |
| IT-02 | Login parent → `GET /api/parent-dashboard` | Child marks + attendance |
| IT-03 | Teacher add result → parent dashboard | New marks visible to linked parent |
| IT-04 | Teacher attendance → Commerce auto | Attendance_Percentage from present/total |
| IT-05 | Parent Commerce auto → Flask → UI | `success: true`, `risk_level` set |
| IT-06 | Parent Pass/Fail auto → Flask → MongoDB `FinalRisk` → `GET /api/risk/final` | New row appears |
| IT-07 | xAPI `POST /api/risk/predict` → `GET /api/risk` | `StudentRisk` row stored |
| IT-08 | Gemini down, chatbot | HTTP 200 with rule-based fallback `source` |
| IT-09 | Settings passMark 55 → add result 50 | Grade F (below 55) not S |
| IT-10 | Admin backup job / POST backup | File under `backend/backups/` |
| IT-11 | Contact POST → admin GET `/api/contact` | Message listed |
| IT-12 | CORS + JSON | Browser on :5173 can call :5001 |

`backend/scripts/smokeTests.js` already automates a subset (wrong password, login, forgot/reset token single-use, contact validation, passMark update) when the API is running. It was not executed in this documentation pass because it needs live credentials and would write contact/settings data. Unit tests in Section 4.19 were used instead so the system was not touched.

## 4.19 Unit-Test Results — 11/11 Passed

Eleven unit tests were added under `testing/unit-tests.mjs`. They import production helpers only. They do not boot Express, Flask, or MongoDB.

Command:

```text
node testing/unit-tests.mjs
```

**Table 4.15 Unit-test results**

| ID | Test | Result |
| --- | --- | --- |
| UT-01 | `calculateGrade` returns A for 75 and above | Pass |
| UT-02 | `calculateGrade` returns B for 65–74 | Pass |
| UT-03 | `calculateGrade` returns C for 55–64 | Pass |
| UT-04 | `calculateGrade` returns S at default pass mark 40 | Pass |
| UT-05 | `calculateGrade` returns F below the pass mark | Pass |
| UT-06 | Custom pass mark 50: 50 → S, 49 → F | Pass |
| UT-07 | `isPassingMark`, `formatMarks`, `formatRank` | Pass |
| UT-08 | Registration accepts a complete valid record | Pass |
| UT-09 | Invalid email and mismatched passwords rejected | Pass |
| UT-10 | Frontend email/password rules match backend policy; studentId required for student role | Pass |
| UT-11 | Grade-level helpers infer 12/13 from class names | Pass |
| **Total** | | **11/11 passed** |

Full console log is stored in `testing/unit-test-results.txt`.

```text
EduTrack unit tests

  PASS  UT-01 calculateGrade returns A for marks of 75 and above
  PASS  UT-02 calculateGrade returns B for marks from 65 to 74
  PASS  UT-03 calculateGrade returns C for marks from 55 to 64
  PASS  UT-04 calculateGrade returns S at the default pass mark
  PASS  UT-05 calculateGrade returns F below the pass mark
  PASS  UT-06 calculateGrade respects a custom pass mark of 50
  PASS  UT-07 isPassingMark, formatMarks and formatRank helpers
  PASS  UT-08 registration validation accepts a complete valid record
  PASS  UT-09 registration validation rejects invalid email and mismatched passwords
  PASS  UT-10 frontend email and password rules match the backend policy
  PASS  UT-11 grade-level helpers infer 12/13 from class names

────────────────────────────
Results: 11/11 passed
────────────────────────────
```

## 4.20 Frontend Lint, JavaScript Syntax and Python Syntax Results

These checks are static. They do not start servers or write to the database.

### 4.20.1 JavaScript syntax

`node --check` was run on backend sources, scripts and the unit-test file (93 files) and on frontend `src/**/*.js` (3 files). **0 syntax failures.**

JSX files are parsed by ESLint’s parser. **0 parse errors** were reported. Failures listed in Section 4.20.3 are lint rules, not invalid JavaScript.

### 4.20.2 Python syntax

`python3 -m py_compile` was run on:

- `ml-model/app.py`
- `ml-model/train_all.py`
- `ml-model/utils/__init__.py`
- `ml-model/utils/paths.py`
- `ml-model/utils/preprocessing.py`
- `ml-model/utils/training.py`
- `ml-model/utils/evaluation.py`
- `ml-model/utils/comparison.py`

**8/8 files passed.** The Flask service can be syntax-checked without installing Python packages; `py_compile` does not import Flask at runtime.

### 4.20.3 Frontend ESLint

Command: `cd frontend && npm run lint`

**Table 4.16 ESLint summary**

| Metric | Value |
| --- | --- |
| Problems | 11 |
| Errors | 11 |
| Warnings | 0 |
| Parse / syntax errors | 0 |

**Table 4.17 ESLint findings (existing application files)**

| File | Rule | Notes |
| --- | --- | --- |
| `PublicLayout.jsx` | `react-hooks/set-state-in-effect` | Closes mobile menu on route change |
| `Login.jsx` | `react-hooks/set-state-in-effect` | Restores remembered email |
| `RiskDashboard.jsx` | `react-hooks/set-state-in-effect` | Loads risk lists on mount |
| `TeacherEssayReview.jsx` (2) | `react-hooks/set-state-in-effect` | Load submissions / reset part marks |
| `AdminSidebar.jsx` | `react-refresh/only-export-components` | Also exports `adminMobileLinks` |
| `TeacherSidebar.jsx` | `react-refresh/only-export-components` | Also exports mobile links |
| `StudentSidebar.jsx` | `react-refresh/only-export-components` | Also exports mobile links |
| `ParentSidebar.jsx` | `react-refresh/only-export-components` | Also exports mobile links |
| `AuthContext.jsx` | `react-refresh/only-export-components` | Also exports `useAuth` |
| `DashboardFeaturePage.jsx` | `no-unused-vars` | Unused `TextField` |

These 11 items are style/hot-reload rules on already-shipped UI files. They do not stop production builds by themselves and were **not** edited in this chapter, in order to leave the running system unchanged. The log is `testing/frontend-eslint.txt`.

**Table 4.18 Quality-gate snapshot used in this chapter**

| Gate | Result |
| --- | --- |
| Unit tests | 11/11 passed |
| Backend + test JS syntax | 93 files, 0 failures |
| Frontend `.js` syntax | 3 files, 0 failures |
| Frontend JSX parse | 0 parse errors |
| Python syntax | 8/8 passed |
| Frontend ESLint | 11 existing rule errors, 0 warnings, 0 syntax errors |

## 4.21 Chapter Summary

EduTrack was implemented as a MERN application with a Flask ML service. React provides public pages and four role dashboards behind JWT-aware routes. Express exposes REST modules for users, academics, essays, reports and risk. MongoDB stores accounts, marks, attendance and Pass/Fail / xAPI prediction documents. Gemini and local NLP support essay marking and study tools.

The Commerce-risk model is a four-feature, three-class Logistic Regression pipeline (accuracy 0.73 on the hold-out set). Express builds those features from Result and Attendance data and calls Flask. Parents see `risk_level` immediately; Pass/Fail and xAPI outputs are also stored for the research dashboard.

Verification for this chapter used read-only checks: **11/11 unit tests passed**, JavaScript and Python syntax checks passed, and frontend ESLint reported 11 existing style findings with no parse errors. Application source, database data and trained pickle files were not modified to produce this chapter.

---

### Figures still required in the Word copy

Insert the screenshots marked in the chapter (login, four dashboards, risk alerts, MongoDB collections, confusion matrix). Place them after the paragraph that first mentions the screen. Caption them as Figure 4.2, 4.3, … in the university template.
