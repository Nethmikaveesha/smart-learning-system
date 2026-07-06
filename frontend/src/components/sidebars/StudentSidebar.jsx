import SidebarSection from "./SidebarSection";

export const studentMobileLinks = [
  { label: "Dashboard", to: "/student" },
  { label: "Subjects", to: "/student/subjects" },
  { label: "Papers", to: "/student/exam-papers" },
  { label: "AI Chatbot", to: "/chatbot" },
  { label: "Progress", to: "/student/performance" },
  { label: "Materials", to: "/student/study-materials" },
];

function StudentSidebar() {
  return (
    <nav className="space-y-2">
      <SidebarSection
        items={[
          { label: "Dashboard", to: "/student" },
          { label: "My Subjects", to: "/student/subjects" },
          { label: "Exam Papers", to: "/student/exam-papers" },
          { label: "Submit Answers", to: "/essay-grader" },
        ]}
      />

      <SidebarSection
        title="Learning Tools"
        items={[
          { label: "Adaptive Learning", to: "/student/adaptive-learning" },
          { label: "AI Chatbot", to: "/chatbot" },
          { label: "Revision Timetable", to: "/student/revision-timetable" },
          { label: "Flashcards", to: "/student/flashcards" },
          { label: "Study Materials", to: "/student/study-materials" },
        ]}
      />

      <SidebarSection
        title="Progress"
        items={[
          { label: "Performance Tracker", to: "/student/performance" },
          { label: "Achievement Badges", to: "/student/badges" },
          { label: "Attendance vs Marks", to: "/student/attendance-vs-marks" },
        ]}
      />

      <SidebarSection
        title="Account"
        items={[
          { label: "Notifications", to: "/student/notifications" },
          { label: "Profile", to: "/student/profile" },
        ]}
      />
    </nav>
  );
}

export default StudentSidebar;
