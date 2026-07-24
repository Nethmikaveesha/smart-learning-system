import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";

const publicLinks = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Features", to: "/features" },
  { label: "Contact", to: "/contact" },
];

const platformLinks = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Features", to: "/features" },
  { label: "Contact", to: "/contact" },
  { label: "Sign In", to: "/login" },
];

const supportLinks = [
  { label: "Help & Support", to: "/contact" },
  { label: "Technical Support", href: "mailto:tech@edutrack.lk" },
  { label: "FAQ", to: "/contact#faq" },
  { label: "Contact Team", to: "/contact#contact-form" },
];

const legalLinks = [
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Terms of Use", to: "/terms" },
  { label: "Data Protection", to: "/data-protection" },
  { label: "Accessibility", to: "/accessibility" },
];

const footerLinkClass =
  "text-sm text-slate-400 transition hover:text-white";

function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="public-site min-h-screen bg-[#f4f7fb] text-slate-900">
      <header
        className={`sticky top-0 z-40 border-b transition-all duration-300 ${
          scrolled
            ? "border-slate-200/90 bg-white/95 shadow-sm shadow-slate-200/60 backdrop-blur-xl"
            : "border-transparent bg-white/80 backdrop-blur-md"
        }`}
      >
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-[72px] lg:px-8">
          <NavLink to="/" className="group flex shrink-0 items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-sky-700 text-sm font-bold text-white shadow-sm transition group-hover:bg-sky-800">
              ET
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-base font-semibold tracking-tight text-slate-950 sm:text-lg">
                EduTrack
              </span>
              <span className="mt-1 hidden text-[11px] font-medium tracking-wide text-slate-500 sm:block">
                Smart Learning System
              </span>
            </span>
          </NavLink>

          <div className="hidden items-center gap-1 lg:flex">
            {publicLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  `relative rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "text-sky-800"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {link.label}
                    <span
                      className={`absolute inset-x-3 -bottom-[1px] h-0.5 rounded-full transition ${
                        isActive ? "bg-sky-700" : "bg-transparent"
                      }`}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <NavLink
              to="/login"
              className="rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:scale-[1.02] hover:bg-sky-800"
            >
              Sign In
            </NavLink>
          </div>

          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 lg:hidden"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden />
            ) : (
              <Menu className="h-5 w-5" aria-hidden />
            )}
          </button>
        </nav>

        {/* Mobile menu */}
        <div
          className={`overflow-hidden border-t border-slate-200 bg-white transition-all duration-300 lg:hidden ${
            mobileOpen ? "max-h-[420px] opacity-100" : "max-h-0 border-transparent opacity-0"
          }`}
        >
          <div className="mx-auto max-w-7xl space-y-1 px-4 py-4 sm:px-6">
            {publicLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  `block rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "bg-sky-50 text-sky-800"
                      : "text-slate-700 hover:bg-slate-50"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}

            <div className="mt-3 grid gap-2 border-t border-slate-100 pt-4">
              <NavLink
                to="/contact"
                className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Contact Team
              </NavLink>
              <NavLink
                to="/login"
                className="rounded-xl bg-sky-700 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-sky-800"
              >
                Sign In
              </NavLink>
            </div>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="border-t border-slate-800 bg-slate-950 text-slate-400">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            <div className="sm:col-span-2 lg:col-span-2">
              <NavLink to="/" className="inline-flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-md bg-sky-600 text-sm font-bold text-white">
                  ET
                </span>
                <span className="text-lg font-semibold text-white">EduTrack</span>
              </NavLink>
              <p className="mt-4 max-w-sm text-sm leading-7 text-slate-400">
                AI-assisted academic management platform for Sri Lankan GCE A/L
                Commerce education.
              </p>
            </div>

            <FooterColumn title="Platform">
              {platformLinks.map((link) => (
                <NavLink
                  key={link.label}
                  to={link.to}
                  end={link.to === "/"}
                  className={footerLinkClass}
                >
                  {link.label}
                </NavLink>
              ))}
            </FooterColumn>

            <FooterColumn title="Support">
              {supportLinks.map((link) =>
                link.href ? (
                  <a
                    key={link.label}
                    href={link.href}
                    className={footerLinkClass}
                  >
                    {link.label}
                  </a>
                ) : (
                  <NavLink
                    key={link.label}
                    to={link.to}
                    className={footerLinkClass}
                  >
                    {link.label}
                  </NavLink>
                )
              )}
            </FooterColumn>

            <FooterColumn title="Legal">
              {legalLinks.map((link) => (
                <NavLink
                  key={link.label}
                  to={link.to}
                  className={footerLinkClass}
                >
                  {link.label}
                </NavLink>
              ))}
            </FooterColumn>
          </div>

          <div className="mt-12 grid gap-8 border-t border-slate-800 pt-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Contact
              </p>
              <div className="mt-3 space-y-2 text-sm">
                <a
                  href="mailto:support@edutrack.lk"
                  className="block transition hover:text-white"
                >
                  support@edutrack.lk
                </a>
                <a
                  href="mailto:tech@edutrack.lk"
                  className="block transition hover:text-white"
                >
                  tech@edutrack.lk
                </a>
                <p>Colombo, Sri Lanka</p>
              </div>
            </div>

            <p className="text-sm text-slate-500">
              © 2026 EduTrack. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterColumn({ title, children }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {title}
      </p>
      <div className="mt-4 flex flex-col gap-3">{children}</div>
    </div>
  );
}

export default PublicLayout;
