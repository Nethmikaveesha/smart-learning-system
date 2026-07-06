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

function DashboardLayout() {
  const { user, logout } = useAuth();
  const role = user?.role || "student";
  const Sidebar = sidebarByRole[role] || StudentSidebar;
  const mobileLinks = mobileLinksByRole[role] || studentMobileLinks;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="flex min-h-16 items-center justify-between px-4 lg:px-6">
          <NavLink
            to={dashboardPaths[role] || "/student"}
            className="text-xl font-bold text-blue-700"
          >
            EduTrack
          </NavLink>

          <div className="flex items-center gap-2">
            <NavLink
              to={`/${role}/notifications`}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Notifications
            </NavLink>
            <NavLink
              to={`/${role}/profile`}
              className="hidden rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 sm:block"
            >
              {user?.fullName || user?.email || "Profile"}
            </NavLink>
            <button
              onClick={logout}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {mobileLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `shrink-0 rounded-md px-3 py-2 text-sm font-semibold ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "bg-slate-100 text-slate-700"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>

      <div className="flex">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-72 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-4 lg:block">
          <p className="mb-4 text-xs font-bold uppercase tracking-wide text-slate-500">
            {role} Menu
          </p>
          <Sidebar />
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
