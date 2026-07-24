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

## Project Structure

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