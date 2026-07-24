import { Link } from "react-router-dom";

/**
 * Shared full-page shell for Login / Forgot / Reset (no marketing chrome).
 */
function AuthShell({
  title,
  subtitle,
  children,
  footer,
  panelTitle = "Welcome back",
  panelText = "Access your dashboard to track progress, manage records, and stay connected with your learning workspace.",
}) {
  return (
    <section className="min-h-screen bg-[#eef2f7]">
      <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-2">
        <aside className="relative hidden overflow-hidden bg-slate-950 px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(56,189,248,0.22),_transparent_55%),radial-gradient(ellipse_at_bottom_left,_rgba(37,99,235,0.18),_transparent_50%)]"
          />

          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-sky-600 text-sm font-bold">
                ET
              </span>
              <span className="text-xl font-semibold tracking-tight">
                EduTrack
              </span>
            </Link>
          </div>

          <div className="relative z-10 max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
              Smart Learning System
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight">{panelTitle}</h1>
            <p className="mt-4 text-base font-normal leading-7 text-slate-300">
              {panelText}
            </p>

            <ul className="mt-8 space-y-3 text-sm text-slate-300">
              <li className="flex gap-3">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                Secure sign-in for your personal dashboard
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                Track attendance, exams, and learning progress
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                Reset your password anytime if you get locked out
              </li>
            </ul>
          </div>

          <p className="relative z-10 text-sm text-slate-500">
            EduTrack — Smart Learning System
          </p>
        </aside>

        <div className="flex items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <Link to="/" className="inline-flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-md bg-sky-700 text-sm font-bold text-white">
                  ET
                </span>
                <span className="text-xl font-semibold tracking-tight text-slate-950">
                  EduTrack
                </span>
              </Link>
              <Link
                to="/"
                className="text-sm font-semibold text-slate-500 hover:text-slate-900"
              >
                Home
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-lg shadow-slate-200/60">
              <div className="mb-7">
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                  {title}
                </h2>
                {subtitle ? (
                  <p className="mt-2 text-base font-normal leading-7 text-slate-600">
                    {subtitle}
                  </p>
                ) : null}
              </div>

              {children}
            </div>

            {footer ? <div className="mt-6 text-center">{footer}</div> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export default AuthShell;
