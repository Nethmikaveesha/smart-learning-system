import SidebarSection from "./SidebarSection";

export const adminMobileLinks = [
  { label: "Dashboard", to: "/admin", end: true },
  { label: "Users", to: "/admin/users" },
  { label: "Add Admin", to: "/admin/users/add" },
  { label: "Classes", to: "/admin/classes" },
  { label: "Exams", to: "/admin/exams" },
  { label: "Analytics", to: "/admin/system-analytics" },
  { label: "Reports", to: "/admin/reports" },
];

function AdminSidebar() {
  return (
    <nav className="space-y-2">
      <SidebarSection
        items={[
          { label: "Dashboard", to: "/admin", end: true },
          { label: "System Analytics", to: "/admin/system-analytics" },
        ]}
      />

      <SidebarSection
        title="User Management"
        items={[
          { label: "Add New Admin", to: "/admin/users/add" },
          { label: "Add Teacher", to: "/admin/users/add-teacher" },
          { label: "Add Student", to: "/admin/users/add-student" },
          { label: "Add Parent", to: "/admin/users/add-parent" },
          { label: "View Users", to: "/admin/users" },
          { label: "Disable User", to: "/admin/users/edit-disable" },
        ]}
      />

      <SidebarSection
        title="Academic Setup"
        items={[
          { label: "Classes", to: "/admin/classes" },
          { label: "Subjects", to: "/admin/subjects" },
          { label: "Teacher Assignments", to: "/admin/teacher-assignments" },
        ]}
      />

      <SidebarSection
        title="Exam Control"
        items={[
          { label: "Exams", to: "/admin/exams" },
          { label: "Exam Timetables", to: "/admin/exam-timetables" },
          { label: "Question Paper Details", to: "/admin/question-paper-details" },
          { label: "Reports", to: "/admin/reports" },
        ]}
      />

      <SidebarSection
        title="System"
        items={[
          { label: "Audit Logs", to: "/admin/audit-logs" },
          { label: "Database Backup", to: "/admin/database-backup" },
          { label: "Settings", to: "/admin/settings" },
        ]}
      />
    </nav>
  );
}

export default AdminSidebar;
