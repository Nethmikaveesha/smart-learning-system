import SidebarSection from "./SidebarSection";

function StudentSidebar() {
  return (
    <nav className="space-y-2">
      <SidebarSection
        items={[
          { label: "Dashboard", to: "/student", end: true },
          { label: "My Subjects", to: "/student/subjects" },
          { label: "Exam Papers", to: "/student/exam-papers" },
          { label: "Submit Answers", to: "/student/essay-grader" },
        ]}
      />

      <SidebarSection
        title="Learning Tools"
        items={[
          { label: "Study Plan", to: "/student/adaptive-learning" },
          { label: "Study Help", to: "/chatbot" },
          { label: "Revision Timetable", to: "/student/revision-timetable" },
          { label: "Flashcards", to: "/student/flashcards" },
          { label: "Study Materials", to: "/student/study-materials" },
        ]}
      />

      <SidebarSection
        title="Progress"
        items={[
          { label: "Performance Tracker", to: "/student/performance" },
          { label: "Commerce Stream Model", to: "/student/commerce-risk" },
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
