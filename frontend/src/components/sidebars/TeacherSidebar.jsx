import SidebarSection from "./SidebarSection";

export const teacherMobileLinks = [
  { label: "Dashboard", to: "/teacher", end: true },
  { label: "Classes", to: "/teacher/classes" },
  { label: "Papers", to: "/teacher/papers" },
  { label: "Submissions", to: "/teacher/submissions" },
  { label: "Analytics", to: "/teacher/topic-error-analysis" },
  { label: "Reports", to: "/teacher/reports" },
];

function TeacherSidebar() {
  return (
    <nav className="space-y-2">
      <SidebarSection
        items={[
          { label: "Dashboard", to: "/teacher", end: true },
          { label: "My Classes", to: "/teacher/classes" },
          { label: "My Subjects", to: "/teacher/subjects" },
        ]}
      />

      <SidebarSection
        title="Paper Workflow"
        items={[
          { label: "Create Paper", to: "/teacher/create-paper" },
          { label: "My Papers", to: "/teacher/papers" },
          { label: "Question Bank", to: "/teacher/question-bank" },
          { label: "Marking Schemes", to: "/teacher/marking-schemes" },
        ]}
      />

      <SidebarSection
        title="Class Operations"
        items={[
          { label: "Student Submissions", to: "/teacher/submissions" },
          { label: "AI Essay Grading", to: "/teacher/submissions" },
          { label: "Marks Management", to: "/teacher/marks" },
          { label: "Attendance Management", to: "/teacher/attendance" },
        ]}
      />

      <SidebarSection
        title="Analytics"
        items={[
          { label: "Topic Error Analysis", to: "/teacher/topic-error-analysis" },
          { label: "Z-Scores & Rankings", to: "/teacher/z-scores-rankings" },
          { label: "Weak Student Detection", to: "/teacher/weak-students" },
          { label: "Score Trends", to: "/teacher/score-trends" },
        ]}
      />

      <SidebarSection
        title="Support"
        items={[
          { label: "AI Content Provider", to: "/teacher/content-provider" },
          { label: "Reports", to: "/teacher/reports" },
          { label: "Notifications", to: "/teacher/notifications" },
          { label: "Profile", to: "/teacher/profile" },
        ]}
      />
    </nav>
  );
}

export default TeacherSidebar;
