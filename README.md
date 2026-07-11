# Smart Learning System

Smart Learning Management System & Performance Monitoring For Advanced Level Students in Sri Lanka Assisting With AI

## Quick Start (MERN)

```bash
# Install dependencies
npm run install:all

# Terminal 1 - Backend (port 5001)
npm run dev:backend

# Terminal 2 - Frontend (port 5173)
npm run dev:frontend
```

Open http://localhost:5173

## Demo Login Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@test.com | 123456 |
| Teacher | teacher@test.com | 123456 |
| Student | student@test.com | 123456 |
| Parent | parent@test.com | 123456 |

## Modules

- Admin Dashboard
- Teacher Dashboard
- Student Dashboard
- Parent Dashboard
- AI Essay Grader
- Attendance Management
- Performance Analytics
- Z-Score & Ranking
- Weak Student Detection
- Smart Revision Planner
- AI Chatbot
- Monthly PDF Reports
- Database Backups

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Tailwind CSS, Recharts |
| Backend | Node.js, Express.js |
| Database | MongoDB |
| AI | Gemini API, NLP keyword matching |
| ML (optional) | Python Flask, scikit-learn |

## Environment Setup

Copy `backend/.env.example` to `backend/.env` and fill in:

- `MONGO_URI`
- `PORT=5001`
- `JWT_SECRET`
- `GEMINI_API_KEY` (for essay grader & chatbot)

## ML API (Optional - Phase 2)

```bash
cd ml-model
pip3 install -r requirements.txt
python3 train_all.py   # train models first
python3 app.py         # starts on port 5000
```
