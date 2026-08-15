import SidebarSection from "./SidebarSection";

function ParentSidebar() {
  return (
    <nav className="space-y-2">
      <SidebarSection
        items={[
          { label: "Dashboard", to: "/parent", end: true },
          { label: "Child Overview", to: "/parent/child-overview" },
        ]}
      />

      <SidebarSection
        title="Academic Progress"
        items={[
          { label: "Marks & Rankings", to: "/parent/marks-rankings" },
          { label: "Monthly Performance", to: "/parent/monthly-performance" },
          { label: "Progress Reports", to: "/parent/progress-reports" },
        ]}
      />

      <SidebarSection
        title="Attendance & Risk"
        items={[
          { label: "Attendance", to: "/parent/attendance" },
          { label: "Risk Alerts", to: "/parent/risk-alerts" },
          { label: "Attendance vs Grades", to: "/parent/attendance-vs-grades" },
        ]}
      />

      <SidebarSection
        title="Account"
        items={[
          { label: "Notifications", to: "/parent/notifications" },
          { label: "Profile", to: "/parent/profile" },
        ]}
      />
    </nav>
  );
}

export default ParentSidebar;
