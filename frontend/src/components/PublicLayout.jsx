import { NavLink, Outlet } from "react-router-dom";

const publicLinks = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Features", to: "/features" },
  { label: "Contact", to: "/contact" },
];

function PublicLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <NavLink to="/" className="text-xl font-bold tracking-tight text-blue-700">
            EduTrack
          </NavLink>

          <div className="flex items-center gap-1 sm:gap-2">
            {publicLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}

            <NavLink
              to="/login"
              className={({ isActive }) =>
                `ml-1 rounded-md px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-blue-700 text-white"
                    : "bg-slate-900 text-white hover:bg-slate-700"
                }`
              }
            >
              Login
            </NavLink>
          </div>
        </nav>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default PublicLayout;
