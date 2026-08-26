import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AdminSidebar from "./sidebars/AdminSidebar";
import TeacherSidebar from "./sidebars/TeacherSidebar";
import StudentSidebar from "./sidebars/StudentSidebar";
import ParentSidebar from "./sidebars/ParentSidebar";
import {
  getAdminMobileLinks,
  teacherMobileLinks,
  studentMobileLinks,
  parentMobileLinks,
} from "./sidebars/mobileNavLinks";
import { getWorkspaceRole } from "../utils/adminRoles";

const dashboardPaths = {
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
  parent: "/parent",
};

const sidebarByRole = {
  admin: AdminSidebar,
  teacher: TeacherSidebar,
  student: StudentSidebar,
  parent: ParentSidebar,
};

const roleLabels = {
  superadmin: "Super Administrator",
  admin: "Administrator",
  teacher: "Teacher",
  student: "Student",
  parent: "Parent",
};

function DashboardLayout() {
  const { user, logout } = useAuth();
  const authRole = user?.role || "student";
  const workspaceRole = getWorkspaceRole(authRole);
  const Sidebar = sidebarByRole[workspaceRole] || StudentSidebar;
  const mobileLinks =
    workspaceRole === "admin"
      ? getAdminMobileLinks(authRole)
      : workspaceRole === "teacher"
        ? teacherMobileLinks
        : workspaceRole === "parent"
          ? parentMobileLinks
          : studentMobileLinks;

  const displayName = user?.fullName || user?.email || "Profile";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="dashboard-app min-h-screen bg-slate-100 text-slate-900">
      {/* Top dashboard navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="flex min-h-16 items-center justify-between px-4 lg:px-6">
          <NavLink
            to={dashboardPaths[workspaceRole] || "/student"}
            className="flex items-center gap-3"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-700 typo-ui text-white shadow-sm">
              ET
            </span>
            <span>
              <span className="block typo-card text-slate-950">EduTrack</span>
              <span className="hidden typo-eyebrow text-slate-500 sm:block">
                {roleLabels[authRole] || roleLabels[workspaceRole]} Workspace
              </span>
            </span>
          </NavLink>

          <div className="flex items-center gap-2">
            <NavLink
              to={`/${workspaceRole}/notifications`}
              className={({ isActive }) =>
                `rounded-lg border px-3 py-2 typo-ui transition ${
                  isActive
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`
              }
            >
              Notifications
            </NavLink>

            <NavLink
              to={`/${workspaceRole}/profile`}
              className="hidden items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 typo-ui text-slate-700 transition hover:bg-slate-200 sm:flex"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-900 typo-caption font-bold text-white">
                {initials}
              </span>
              <span className="max-w-36 truncate">{displayName}</span>
            </NavLink>

            <button
              type="button"
              onClick={logout}
              className="rounded-lg bg-red-600 px-4 py-2 typo-ui font-bold text-white shadow-sm transition hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Mobile role navigation */}
      <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {mobileLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `shrink-0 rounded-lg px-3 py-2 typo-ui transition ${
                  isActive
                    ? "bg-blue-700 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-72 shrink-0 overflow-y-auto border-r border-slate-200 bg-white lg:block">
          <div className="border-b border-slate-100 p-4">
            <p className="typo-eyebrow text-slate-400">
              {workspaceRole} Menu
            </p>
            <p className="mt-1 typo-ui text-slate-700">Manage your workspace</p>
          </div>

          <div className="p-4">
            <Sidebar />
          </div>
        </aside>

        {/* Main page content */}
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
