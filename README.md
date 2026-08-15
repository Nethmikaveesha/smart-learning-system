# EduTrack - Smart Learning System

EduTrack is a Smart Learning System built for school academic management, student performance tracking, parent monitoring, teacher workflows, and ML-based academic risk prediction.

The system includes a MERN web application and a Python Flask ML service. The MERN application handles users, dashboards, academic records, reports, and role-based features. The ML service provides student risk predictions using trained machine-learning models.

## Main Features

### Public Website
- Home page
- About page
- Features page
- Contact page
- Login page

### Admin Dashboard
- User management
- Add teacher, student, and parent accounts
- Class and subject management
- Teacher assignment management
- Exam timetable management
- Reports
- Settings
- Database backup

### Teacher Dashboard
- My classes
- My subjects
- Paper management
- Question bank
- Student submissions
- AI essay grading
- Marks management
- Attendance management
- Topic error analysis
- Weak student detection
- Reports

### Student Dashboard
- My subjects
- Exam papers
- Submit answers
- Adaptive learning
- Performance tracker
- AI chatbot
- Revision timetable
- Achievement badges
- Flashcards
- Study materials

### Parent Dashboard
- Child overview
- Marks and rankings
- Monthly performance
- Attendance
- Risk alerts
- Attendance vs grades
- Progress reports
- ML risk prediction results

## ML Models

The project uses three ML models.

| Model | Status | Purpose |
| --- | --- | --- |
| Pass/Fail Risk Model | Mandatory | Predicts whether a student is likely to pass or fail |
| Multi-Class Commerce Risk Model | Recommended | Predicts High Risk, Medium Risk, or Low Risk for A/L Commerce students |
| xAPI Performance Model | Optional | Benchmark/research model using xAPI-Edu-Data |

## Technology Stack

### Frontend
- React
- Vite
- React Router
- Tailwind CSS
- Axios
- Recharts

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- PDFKit
- Node Cron
- Gemini API integration

### ML Service
- Python
- Flask
- Pandas
- Scikit-learn
- Joblib
- Matplotlib
- Jupyter Notebook

## Quick setup

| Service | Port | Start |
| --- | --- | --- |
| MongoDB | 27017 | local or Atlas |
| Backend | **5001** | `cd backend && cp .env.example .env && npm install && npm run dev` |
| ML (Flask) | **5000** | `cd ml-model && pip install -r requirements.txt && python3 train_all.py && python3 app.py` |
| Frontend | **5173** | `cd frontend && npm install && npm run dev` |

Train once before starting Flask: `python3 train_all.py` writes Pass/Fail + Commerce models into `ml-model/models/` (those `.pkl` files are gitignored). Optional local debug: `FLASK_DEBUG=1 python3 app.py`.

Fill `backend/.env` with `MONGO_URI`, `JWT_SECRET`, optional `GEMINI_API_KEY`, and `CORS_ORIGINS=http://localhost:5173`.

### Commerce risk demo data (3 risk levels)

```bash
cd backend
npm run seed:commerce-risk
```

Creates `12 Commerce A` / `13 Commerce A`, ACC/BS/ECO subjects, and three students with saved **CommerceRisk** predictions.

| Role | Email | Password | Notes |
| --- | --- | --- | --- |
| Teacher | `teacher@edutrack.test` | `123456` | Commerce teacher |
| Parent | `parent@edutrack.test` | `123456` | Linked to demo students |
| Student (Low) | `low.risk@edutrack.test` | `123456` | Low Risk sample |
| Student (Medium) | `medium.risk@edutrack.test` | `123456` | Medium Risk sample |
| Student (High) | `high.risk@edutrack.test` | `123456` | High Risk sample |

### Tests

```bash
node testing/unitTests.js    # grade / rank / z-score (no server)
node testing/apiTests.js     # security + role + risk auth (backend running)
```

### Still optional for thesis evidence
- Live Gemini essay/chatbot walkthrough screenshots
- Manual Z-score / correlation calculation vs system screenshot
- UAT feedback form from teacher/student/parent/admin
- Deploy to Vercel + Render + Atlas (or document local install as evidence)

### Ranking and correlation notes (for viva / thesis)
- **Equal marks:** after sorting by marks descending, ranks are consecutive (`1, 2, 3…`). Tied scores do **not** share the same rank number — document this as the system rule in your thesis.
- **Attendance–marks correlation:** the analytics API builds paired chart points (attendance % vs marks) for graphs. It does not compute a Pearson *r* coefficient; calculate *r* manually from the same pairs for thesis evidence if required.
- **Single-student class:** mean equals that student’s marks, SD = 0, Z-score = 0, rank = 1.

### Project Structure

```text
Smart-Learning-System/
├── backend/
│   ├── src/
│   ├── scripts/
│   ├── backups/
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
│
├── ml-model/
│   ├── app.py
│   ├── train_all.py
│   ├── requirements.txt
│   ├── datasets/
│   ├── models/
│   ├── notebooks/
│   ├── outputs/
│   └── utils/
│
├── docs/
├── datasets/
├── research/
├── testing/
└── README.md