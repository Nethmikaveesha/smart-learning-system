import { NavLink, Outlet } from "react-router-dom";

const publicLinks = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Features", to: "/features" },
  { label: "Contact", to: "/contact" },
];

function PublicLayout() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Public navigation */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <nav className="mx-auto flex min-h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <NavLink to="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-700 text-sm font-black text-white">
              ET
            </span>
            <span className="text-xl font-black tracking-tight text-slate-950">
              EduTrack
            </span>
          </NavLink>

          <div className="hidden items-center gap-1 md:flex">
            {publicLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-bold transition ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          <NavLink
            to="/login"
            className={({ isActive }) =>
              `rounded-lg px-4 py-2 text-sm font-black transition ${
                isActive
                  ? "bg-blue-700 text-white"
                  : "bg-slate-950 text-white hover:bg-slate-800"
              }`
            }
          >
            Login
          </NavLink>
        </nav>

        {/* Mobile public links */}
        <div className="border-t border-slate-100 px-4 py-2 md:hidden">
          <div className="flex gap-2 overflow-x-auto">
            {publicLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `shrink-0 rounded-lg px-3 py-2 text-sm font-bold ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "bg-slate-100 text-slate-700"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      {/* Simple footer */}
      <footer className="border-t border-slate-200 bg-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-slate-400 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p className="font-semibold text-white">EduTrack</p>
          <p>Smart academic management for schools.</p>
        </div>
      </footer>
    </div>
  );
}

export default PublicLayout;