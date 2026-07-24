import { NavLink } from "react-router-dom";

const roles = [
  {
    title: "Administrator",
    text: "Manage users, classes, subjects, examinations, academic reports, and overall system operations from one administrative dashboard.",
  },
  {
    title: "Teacher",
    text: "Create examinations, record marks, manage attendance, review essay submissions with guided feedback, and monitor students who need extra support.",
  },
  {
    title: "Student",
    text: "View examination results, monitor academic performance, get study guidance, and access personalised learning resources.",
  },
  {
    title: "Parent",
    text: "Track attendance, review examination performance, follow academic progress reports, and receive early alerts when support may be needed.",
  },
];

const features = [
  {
    title: "Academic Performance Analytics",
    text: "Monitor examination performance, grades, rankings, and academic progress through interactive dashboards.",
  },
  {
    title: "Essay Evaluation Support",
    text: "Speed up marking of descriptive answers with suggested feedback that teachers can review before finalising marks.",
  },
  {
    title: "Early Risk Alerts",
    text: "Spot students who may need additional support based on attendance and examination patterns.",
  },
  {
    title: "Attendance Management",
    text: "Record attendance efficiently and analyse attendance trends to improve student engagement.",
  },
  {
    title: "Progress Monitoring",
    text: "Track student performance across examinations with visual reports, charts, and academic summaries.",
  },
  {
    title: "Parent Engagement",
    text: "Give parents secure access to attendance, academic reports, and timely progress notifications.",
  },
];

const steps = [
  "Teachers record attendance and examination marks.",
  "The system organises academic performance and learning progress.",
  "Essay answers receive guided feedback for teacher review.",
  "Early alerts highlight students who may need extra support.",
  "Students, parents, teachers, and administrators get clear, role-based insights.",
];

const reasons = [
  "Designed specifically for Sri Lankan GCE Advanced Level Commerce education",
  "Role-based secure access for every stakeholder",
  "Faster essay review with teacher-controlled feedback",
  "Early alerts based on attendance and exam performance",
  "Interactive dashboards and clear academic reports",
  "Comprehensive progress tracking for classes and individuals",
  "Modern responsive web application",
  "Secure centralized academic data management",
];

/**
 * Marketing home page for EduTrack.
 * Hero stays one composition: brand, headline, support line, CTAs, full-bleed photo.
 */
function HomePage() {
  return (
    <div className="public-site bg-[#f4f7fb] text-slate-900">
      {/* Hero */}
      <section className="relative isolate min-h-[calc(100vh-65px)] overflow-hidden">
        <img
          src="/al-students.png"
          alt="Sri Lankan GCE Advanced Level students"
          className="absolute inset-0 h-full w-full object-cover object-center motion-safe:animate-[home-zoom_18s_ease-out_forwards]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/88 via-slate-950/62 to-slate-900/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-slate-950/25" />

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-65px)] max-w-7xl items-end px-4 pb-16 pt-24 sm:px-6 sm:pb-20 lg:items-center lg:px-8 lg:pb-24">
          <div className="max-w-3xl motion-safe:animate-[home-rise_0.9s_ease-out_both]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-300">
              Academic Management Platform
            </p>

            <p className="typo-hero mt-5 tracking-tight text-white">
              EduTrack
            </p>

            <h1 className="typo-section mt-5 max-w-3xl tracking-tight text-white">
              Smart Learning System for Sri Lankan GCE A/L Commerce Education
            </h1>

            <p className="typo-body mt-5 max-w-2xl text-slate-200">
              Manage attendance, examinations, and academic progress in one
              secure platform with clear dashboards for teachers, students,
              parents, and administrators.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <NavLink
                to="/login"
                className="rounded-md bg-sky-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-800"
              >
                Sign In
              </NavLink>
              <NavLink
                to="/contact"
                className="rounded-md border border-white/35 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                Contact us
              </NavLink>
            </div>
          </div>
        </div>
      </section>

      {/* About the Platform */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:grid lg:grid-cols-[0.95fr_1.05fr] lg:gap-16 lg:px-8 lg:py-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">
              About the Platform
            </p>
            <h2 className="typo-section mt-3 tracking-tight text-slate-950">
              Built for Modern Sri Lankan Schools
            </h2>
          </div>
          <p className="typo-body mt-6 text-slate-600 lg:mt-10">
            EduTrack is an academic management platform designed for Sri Lankan
            GCE Advanced Level Commerce education. It brings administration,
            attendance, examinations, and progress reporting together so
            teachers, parents, and administrators can work from one clear
            system.
          </p>
        </div>
      </section>

      {/* User Roles */}
      <section className="border-t border-slate-200 bg-[#f4f7fb]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <h2 className="typo-section tracking-tight text-slate-950">
              Designed Around Real School Responsibilities
            </h2>
            <p className="typo-body mt-4 text-slate-600">
              Every user accesses a dedicated dashboard with tools designed
              specifically for their responsibilities.
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-2">
            {roles.map((role) => (
              <div key={role.title} className="border-l-2 border-sky-600 pl-5">
                <h3 className="typo-card text-slate-950">{role.title}</h3>
                <p className="typo-body mt-3 text-slate-600">{role.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <h2 className="typo-section tracking-tight text-slate-950">
              Powerful Academic Management Features
            </h2>
            <p className="typo-body mt-4 text-slate-600">
              Core tools that support daily school operations and intelligent
              academic decision-making.
            </p>
          </div>

          <div className="mt-12 grid gap-x-10 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.title}>
                <h3 className="typo-card text-slate-950">{feature.title}</h3>
                <p className="typo-body mt-3 text-slate-600">{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <h2 className="typo-section max-w-3xl tracking-tight">
            From Academic Records to Intelligent Decision Making
          </h2>

          <ol className="mt-12 max-w-3xl space-y-0">
            {steps.map((step, index) => (
              <li key={step} className="relative pb-10 last:pb-0">
                {index < steps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute left-[15px] top-10 h-[calc(100%-1.25rem)] w-px bg-slate-700"
                  />
                )}
                <div className="flex gap-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sky-600 text-sm font-semibold">
                    {index + 1}
                  </span>
                  <p className="typo-body pt-1 text-slate-200">{step}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Why Choose */}
      <section className="border-t border-slate-800 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:grid lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-8 lg:py-20">
          <div>
            <h2 className="typo-section tracking-tight text-slate-950">
              Why Choose Smart Learning System
            </h2>
          </div>
          <ul className="mt-8 space-y-4 lg:mt-2">
            {reasons.map((reason) => (
              <li
                key={reason}
                className="typo-body border-l-2 border-sky-600 pl-4 text-slate-700"
              >
                {reason}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[#eef5fb]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <h2 className="typo-section max-w-3xl tracking-tight text-slate-950">
            Better academic coordination, clearer outcomes
          </h2>
          <p className="typo-body mt-4 max-w-2xl text-slate-600">
            Support teachers, motivate students, engage parents, and simplify
            academic administration with one connected learning platform.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <NavLink
              to="/login"
              className="inline-flex rounded-md bg-sky-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-800"
            >
              Sign In
            </NavLink>
            <NavLink
              to="/contact"
              className="inline-flex rounded-md border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Contact us
            </NavLink>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
