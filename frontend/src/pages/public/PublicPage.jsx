import { NavLink } from "react-router-dom";
import heroImage from "../../assets/hero.png";

const pageContent = {
  home: {
    title: "EduTrack",
    subtitle:
      "A smart learning system for admins, teachers, students, and parents to manage learning progress from one place.",
  },
  about: {
    title: "About EduTrack",
    subtitle:
      "EduTrack connects academic records, attendance, AI-assisted feedback, and parent visibility in a role-based learning platform.",
  },
  features: {
    title: "Features",
    subtitle:
      "Dashboards, exam analytics, AI grading, adaptive learning, reports, alerts, flashcards, and performance tracking are organized by user role.",
  },
  contact: {
    title: "Contact",
    subtitle:
      "School administrators can use EduTrack to coordinate teacher, student, and parent access with clear learning insights.",
  },
};

function PublicPage({ page = "home" }) {
  const content = pageContent[page] || pageContent.home;

  return (
    <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
      <div>
        <p className="mb-3 text-sm font-bold uppercase tracking-wide text-blue-700">
          Smart Learning System
        </p>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
          {content.title}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
          {content.subtitle}
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <NavLink
            to="/login"
            className="rounded-md bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Login
          </NavLink>
          <NavLink
            to="/features"
            className="rounded-md border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-white"
          >
            View Features
          </NavLink>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <img
          src={heroImage}
          alt="EduTrack learning dashboard preview"
          className="h-56 w-full object-cover"
        />
        <div className="p-6">
          <h2 className="text-lg font-bold text-slate-950">
            Role-based access
          </h2>
          <div className="mt-5 grid gap-3">
            {["Admin", "Teacher", "Student", "Parent"].map((role) => (
              <div
                key={role}
                className="flex items-center justify-between rounded-md bg-slate-50 px-4 py-3"
              >
                <span className="font-semibold text-slate-800">{role}</span>
                <span className="text-sm text-slate-500">Dashboard ready</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default PublicPage;
