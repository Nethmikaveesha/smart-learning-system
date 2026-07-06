import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  CartesianGrid,
} from "recharts";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function StudentDashboard() {
  const { token } = useAuth();

  const [data, setData] = useState(null);
  const [studyPlan, setStudyPlan] = useState([]);
  const [correlationData, setCorrelationData] = useState([]);
  const [contentRecommendations, setContentRecommendations] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [adaptivePlan, setAdaptivePlan] = useState([]);
  const [error, setError] = useState("");
  const [badges, setBadges] = useState([]);
  const [revisionTimetable, setRevisionTimetable] = useState([]);

  // Chatbot සඳහා නව States එකතු කරන ලදී ✅
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatAnswer, setChatAnswer] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get("/student-dashboard", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setData(res.data);

        const plannerRes = await api.get("/study-planner", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setStudyPlan(plannerRes.data.plan);

        const correlationRes = await api.get(
          "/analytics/attendance-marks",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setCorrelationData(correlationRes.data);

        const contentRes = await api.get("/content-recommendations", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setContentRecommendations(contentRes.data);

        const flashcardRes = await api.get("/flashcards", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setFlashcards(flashcardRes.data);

        const adaptiveRes = await api.get("/adaptive-learning", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setAdaptivePlan(adaptiveRes.data.adaptivePlan);

        const badgeRes = await api.get("/badges/student", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const revisionRes = await api.get(
          "/study-planner/revision-timetable",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setRevisionTimetable(revisionRes.data.timetable || []);
        setBadges(badgeRes.data.badges);
      } catch (error) {
        console.error(
          "Student Dashboard Error:",
          error.response?.data || error
        );

        setError(
          error.response?.data?.message ||
            "Failed to load student dashboard"
        );
      }
    };

    if (token) {
      fetchDashboard();
    }
  }, [token]);

  const performanceData =
    data?.results?.map((result) => ({
      exam: result.exam?.examName || "Unknown Exam",
      marks: Number(result.marks) || 0,
      zScore:
        result.zScore !== null && result.zScore !== undefined
          ? Number(result.zScore)
          : null,
    })) || [];

  // Chatbot API එකට ප්‍රශ්න යොමු කරන function එක එකතු කරන ලදී ✅
  const askChatbot = async () => {
    try {
      if (!chatQuestion.trim()) return;

      setChatLoading(true);
      setChatAnswer("");

      const res = await api.post(
        "/chatbot/ask",
        { question: chatQuestion },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setChatAnswer(res.data.answer);
    } catch (error) {
      setChatAnswer(
        error.response?.data?.message || "Failed to get chatbot response"
      );
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="mb-6 text-3xl font-bold">Student Dashboard</h1>

      {error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded">
          {error}
        </div>
      ) : !data ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card title="Attendance" value={`${data.attendancePercentage}%`} />
            <Card title="Current Z-Score" value={data.currentZScore} />
            <Card title="Risk Status" value={data.riskStatus} />
            <Card
              title="Latest Grade"
              value={data.latestResult?.grade || "N/A"}
            />
          </div>

          <div className="bg-white rounded-xl shadow p-5 mb-8">
            <h2 className="text-xl font-bold mb-4">Student Information</h2>

            <p className="mb-2">
              <strong>Name:</strong> {data.student?.user?.fullName}
            </p>

            <p className="mb-2">
              <strong>Email:</strong> {data.student?.user?.email}
            </p>

            <p className="mb-2">
              <strong>Student ID:</strong> {data.student?.studentId}
            </p>

            <p className="mb-2">
              <strong>Class:</strong> {data.student?.class?.className}
            </p>
          </div>

          <Section title="Academic Performance Tracker">
            <p className="text-sm text-slate-500 mb-4">
              Marks and Z-Score trends across examinations
            </p>

            {performanceData.length === 0 ? (
              <p>No examination performance data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="exam" />

                  <YAxis
                    yAxisId="marks"
                    orientation="left"
                    domain={[0, 100]}
                  />

                  <YAxis
                    yAxisId="zScore"
                    orientation="right"
                    domain={["auto", "auto"]}
                  />

                  <Tooltip />

                  <Line
                    yAxisId="marks"
                    type="monotone"
                    dataKey="marks"
                    name="Marks"
                    strokeWidth={3}
                    connectNulls
                  />

                  <Line
                    yAxisId="zScore"
                    type="monotone"
                    dataKey="zScore"
                    name="Z-Score"
                    strokeWidth={3}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            )}

            <div className="flex gap-6 mt-4 text-sm">
              <span>Marks Trend</span>
              <span>Z-Score Trend</span>
            </div>
          </Section>

          <div className="bg-white rounded-xl shadow p-5 mb-8">
            <h2 className="text-xl font-bold mb-4">
              Attendance vs Marks Correlation
            </h2>

            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid />
                <XAxis
                  type="number"
                  dataKey="attendance"
                  name="Attendance"
                  unit="%"
                />
                <YAxis
                  type="number"
                  dataKey="averageMarks"
                  name="Average Marks"
                />
                
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                
                <Scatter name="Students" data={correlationData} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* AI Chatbot Support Section එක මෙතනට ඇතුළත් කරන ලදී ✅ */}
          <Section title="AI Chatbot Support">
            <p className="text-sm text-slate-500 mb-4">
              Ask questions related to Accounting, Business Studies, Economics, study
              planning, attendance, marks, and exam preparation.
            </p>

            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <input
                type="text"
                value={chatQuestion}
                onChange={(e) => setChatQuestion(e.target.value)}
                placeholder="Type your question here..."
                className="flex-1 border rounded-lg px-4 py-2"
              />

              <button
                onClick={askChatbot}
                disabled={chatLoading}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg disabled:bg-blue-300"
              >
                {chatLoading ? "Thinking..." : "Ask AI"}
              </button>
            </div>

            {chatAnswer && (
              <div className="bg-slate-50 border rounded-lg p-4">
                <p className="font-semibold mb-2">AI Answer</p>
                <p className="text-slate-700">{chatAnswer}</p>
              </div>
            )}
          </Section>

          <Section title="AI Content Recommendations">
            {contentRecommendations.length === 0 ? (
              <p>No recommendations available.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contentRecommendations.map((item) => (
                  <div key={item._id} className="border rounded-lg p-4 bg-slate-50">
                    <h3 className="font-bold text-lg">{item.noteTitle}</h3>
                    <p className="text-sm text-slate-600 mb-2">
                      Subject: {item.subject?.subjectName}
                    </p>
                    <p className="mb-2">
                      <strong>Topic:</strong> {item.topic}
                    </p>
                    <p className="mb-2">{item.noteDescription}</p>
                    <p className="mb-2">
                      <strong>Difficulty:</strong> {item.difficultyLevel}
                    </p>
                    {item.videoLink && (
                      <a
                        href={item.videoLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 underline"
                      >
                        Watch Video
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Active Recall Flashcards">
            {flashcards.length === 0 ? (
              <p>No flashcards available.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {flashcards.map((card) => (
                  <div key={card._id} className="border rounded-lg p-4 bg-slate-50">
                    <p className="text-sm text-slate-600 mb-2">
                      {card.subject?.subjectName} | {card.topic}
                    </p>
                    <h3 className="font-bold mb-2">Q: {card.question}</h3>
                    <p className="mb-2">
                      <strong>A:</strong> {card.answer}
                    </p>
                    <p className="text-sm">
                      <strong>Difficulty:</strong> {card.difficulty}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Adaptive Learning Recommendations">
            {adaptivePlan.length === 0 ? (
              <p className="text-green-600 font-semibold">
                No weak subjects detected. Great job!
              </p>
            ) : (
              <div className="space-y-5">
                {adaptivePlan.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-orange-50">
                    <h3 className="text-lg font-bold mb-2">{item.subject}</h3>
                    <p>
                      <strong>Marks:</strong> {item.marks}
                    </p>
                    <p className="mb-3">{item.recommendation}</p>

                    <h4 className="font-semibold mb-2">Recommended Notes</h4>
                    {item.notes?.map((note) => (
                      <div key={note._id} className="mb-3 p-3 bg-white rounded border">
                        <strong>{note.noteTitle}</strong>
                        <p>{note.noteDescription}</p>
                        {note.videoLink && (
                          <a
                            href={note.videoLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 underline"
                          >
                            Watch Video
                          </a>
                        )}
                      </div>
                    ))}

                    <h4 className="font-semibold mt-4 mb-2">
                      Practice Flashcards
                    </h4>
                    {item.flashcards?.map((card) => (
                      <div key={card._id} className="bg-white rounded border p-3 mb-2">
                        <p>
                          <strong>Q:</strong> {card.question}
                        </p>
                        <p>
                          <strong>A:</strong> {card.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Academic Achievement Badges">
            {badges.length === 0 ? (
              <p>No badges earned yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {badges.map((badge, index) => (
                  <div
                    key={index}
                    className="bg-yellow-50 border rounded-lg p-5 text-center shadow"
                  >
                    <div className="text-6xl mb-3">{badge.icon}</div>

                    <h3 className="font-bold text-lg">{badge.title}</h3>

                    <p className="text-slate-600 mt-2">
                      {badge.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Intelligent Revision Timetable">
            <p className="text-sm text-slate-500 mb-4">
              Personalized daily revision schedule based on upcoming exams,
              remaining days, and previous academic performance.
            </p>

            {revisionTimetable.length === 0 ? (
              <div className="bg-slate-50 border rounded-lg p-4">
                <p className="text-slate-500">
                  No upcoming examination timetable available.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {revisionTimetable.map((item, index) => (
                  <div
                    key={`${item.examName}-${item.subject}-${index}`}
                    className="border rounded-xl p-5 bg-slate-50"
                  >
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                      <div>
                        <h3 className="text-lg font-bold">{item.subject}</h3>

                        <p className="text-slate-600">{item.examName}</p>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          item.priority === "High"
                            ? "bg-red-100 text-red-700"
                            : item.priority === "Medium"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {item.priority} Priority
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
                      <div className="bg-white border rounded-lg p-3">
                        <p className="text-sm text-slate-500">Exam Date</p>

                        <p className="font-bold mt-1">
                          {new Date(item.examDate).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="bg-white border rounded-lg p-3">
                        <p className="text-sm text-slate-500">
                          Days Remaining
                        </p>

                        <p className="font-bold mt-1">
                          {item.daysRemaining} days
                        </p>
                      </div>

                      <div className="bg-white border rounded-lg p-3">
                        <p className="text-sm text-slate-500">Average Marks</p>

                        <p className="font-bold mt-1">{item.averageMarks}</p>
                      </div>

                      <div className="bg-white border rounded-lg p-3">
                        <p className="text-sm text-slate-500">Daily Revision</p>

                        <p className="font-bold mt-1">
                          {item.dailyStudyHours} hrs/day
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 bg-white border rounded-lg p-4">
                      <p className="text-sm text-slate-500 mb-1">
                        Personalized Recommendation
                      </p>

                      <p className="font-medium">{item.recommendation}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Smart Study Planner">
            <table className="w-full border">
              <thead className="bg-slate-200">
                <tr>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Average Marks</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Study Hours</th>
                </tr>
              </thead>

              <tbody>
                {studyPlan.map((item, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-3">{item.subject}</td>
                    <td className="p-3">{item.averageMarks}</td>
                    <td className="p-3">{item.priority}</td>
                    <td className="p-3">{item.recommendedHours} hrs/day</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-xl font-bold mb-4">Exam Results</h2>

            <table className="w-full border">
              <thead className="bg-slate-200">
                <tr>
                  <th className="p-3">Exam</th>
                  <th className="p-3">Marks</th>
                  <th className="p-3">Grade</th>
                  <th className="p-3">Z-Score</th>
                  <th className="p-3">Rank</th>
                </tr>
              </thead>

              <tbody>
                {data.results?.map((result) => (
                  <tr key={result._id} className="border-t">
                    <td className="p-3">{result.exam?.examName}</td>
                    <td className="p-3">{result.marks}</td>
                    <td className="p-3">{result.grade}</td>
                    <td className="p-3">{result.zScore}</td>
                    <td className="p-3">{result.rank}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="bg-white p-5 rounded-xl shadow">
      <p className="text-slate-500">{title}</p>
      <h2 className="text-3xl font-bold mt-2">{value}</h2>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl shadow p-5 mb-8">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default StudentDashboard;
