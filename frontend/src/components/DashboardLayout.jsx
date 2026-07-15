import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AdminSidebar, { adminMobileLinks } from "./sidebars/AdminSidebar";
import TeacherSidebar, { teacherMobileLinks } from "./sidebars/TeacherSidebar";
import StudentSidebar, { studentMobileLinks } from "./sidebars/StudentSidebar";
import ParentSidebar, { parentMobileLinks } from "./sidebars/ParentSidebar";

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

const mobileLinksByRole = {
  admin: adminMobileLinks,
  teacher: teacherMobileLinks,
  student: studentMobileLinks,
  parent: parentMobileLinks,
};

const roleLabels = {
  admin: "Administrator",
  teacher: "Teacher",
  student: "Student",
  parent: "Parent",
};

function DashboardLayout() {
  const { user, logout } = useAuth();
  const role = user?.role || "student";
  const Sidebar = sidebarByRole[role] || StudentSidebar;
  const mobileLinks = mobileLinksByRole[role] || studentMobileLinks;

  const displayName = user?.fullName || user?.email || "Profile";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Top dashboard navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="flex min-h-16 items-center justify-between px-4 lg:px-6">
          <NavLink
            to={dashboardPaths[role] || "/student"}
            className="flex items-center gap-3"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-700 text-sm font-black text-white shadow-sm">
              ET
            </span>
            <span>
              <span className="block text-xl font-black tracking-tight text-slate-950">
                EduTrack
              </span>
              <span className="hidden text-xs font-semibold uppercase tracking-wide text-slate-500 sm:block">
                {roleLabels[role]} Workspace
              </span>
            </span>
          </NavLink>

          <div className="flex items-center gap-2">
            <NavLink
              to={`/${role}/notifications`}
              className={({ isActive }) =>
                `rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`
              }
            >
              Notifications
            </NavLink>

            <NavLink
              to={`/${role}/profile`}
              className="hidden items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 sm:flex"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">
                {initials}
              </span>
              <span className="max-w-36 truncate">{displayName}</span>
            </NavLink>

            <button
              type="button"
              onClick={logout}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
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
                `shrink-0 rounded-lg px-3 py-2 text-sm font-bold transition ${
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
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              {role} Menu
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-700">
              Manage your workspace
            </p>
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