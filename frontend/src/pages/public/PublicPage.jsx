import { NavLink } from "react-router-dom";
import heroImage from "../../assets/hero.png";

const roleCards = [
  {
    title: "Administrators",
    description: "Manage users, classes, subjects, reports, and system records.",
  },
  {
    title: "Teachers",
    description: "Create papers, manage marks, review submissions, and track progress.",
  },
  {
    title: "Students",
    description: "View subjects, exams, revision plans, performance, and learning support.",
  },
  {
    title: "Parents",
    description: "Monitor attendance, marks, rankings, reports, and academic risk alerts.",
  },
];

const featureCards = [
  "Role-based dashboards",
  "Attendance and marks tracking",
  "AI-assisted essay grading",
  "ML-based academic risk prediction",
  "Progress reports",
  "Revision and learning support",
];

const pageCopy = {
  home: {
    eyebrow: "Smart Learning System",
    title: "EduTrack",
    subtitle:
      "A secure academic management platform for schools to track learning progress, attendance, results, and student risk through role-based dashboards.",
  },
  about: {
    eyebrow: "About",
    title: "Built for connected academic monitoring",
    subtitle:
      "EduTrack helps schools organize academic data and provide clear visibility for administrators, teachers, students, and parents.",
  },
  features: {
    eyebrow: "Features",
    title: "Everything organized by user role",
    subtitle:
      "From user management and exam records to AI learning tools and risk prediction, EduTrack keeps school workflows in one platform.",
  },
  contact: {
    eyebrow: "Contact",
    title: "Coordinate school access with EduTrack",
    subtitle:
      "EduTrack is designed for school environments where user accounts are created and managed by administrators.",
  },
};

function PublicPage({ page = "home" }) {
  const content = pageCopy[page] || pageCopy.home;

  return (
    <div className="bg-white">
      <section className="mx-auto grid min-h-[calc(100vh-65px)] max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        {/* Main public page message */}
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
            {content.eyebrow}
          </p>

          <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            {content.title}
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            {content.subtitle}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <NavLink
              to="/login"
              className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-800"
            >
              Login
            </NavLink>

            <NavLink
              to="/features"
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              View Features
            </NavLink>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <StatCard value="4" label="User roles" />
            <StatCard value="AI" label="Learning support" />
            <StatCard value="ML" label="Risk prediction" />
          </div>
        </div>

        {/* Visual dashboard preview */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
          <img
            src={heroImage}
            alt="EduTrack dashboard preview"
            className="h-64 w-full object-cover"
          />

          <div className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Platform Access
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  Role-based dashboards
                </h2>
              </div>

              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                Active
              </span>
            </div>

            <div className="grid gap-3">
              {roleCards.map((role) => (
                <div
                  key={role.title}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="font-black text-slate-900">{role.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {role.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Page-specific lower content */}
      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          {page === "contact" ? <ContactSection /> : <FeatureSection />}
        </div>
      </section>
    </div>
  );
}

function FeatureSection() {
  return (
    <>
      <div className="mb-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
          Core Capabilities
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
          Built for daily academic workflows
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {featureCards.map((feature) => (
          <div
            key={feature}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="font-black text-slate-950">{feature}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function ContactSection() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
          Contact
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
          School administration access
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          EduTrack accounts are managed by the school administrator. Contact the
          system administrator to create teacher, student, or parent accounts.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-black text-slate-950">Platform Scope</p>
        <div className="mt-4 space-y-3 text-sm font-semibold text-slate-700">
          <p>Academic dashboards</p>
          <p>Student progress monitoring</p>
          <p>Parent visibility and risk alerts</p>
          <p>AI and ML supported learning insights</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ value, label }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
    </div>
  );
}

export default PublicPage;