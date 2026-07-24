import { NavLink } from "react-router-dom";
import {
  BarChart3,
  Bot,
  BookOpen,
  BrainCircuit,
  ChartSpline,
  Check,
  ClipboardCheck,
  GraduationCap,
  School,
  ShieldCheck,
  Users,
} from "lucide-react";

const principles = [
  {
    icon: School,
    title: "Centralized Academic Management",
    text: "Manage attendance, examinations, student records, academic reports, and progress insights from a single secure platform.",
  },
  {
    icon: Bot,
    title: "Guided Essay Feedback",
    text: "Help teachers review descriptive answers faster with suggested feedback they can refine before finalising marks.",
  },
  {
    icon: BrainCircuit,
    title: "Early Academic Risk Detection",
    text: "Highlight students who may need extra support by reviewing attendance and examination patterns before issues become critical.",
  },
];

const technologies = [
  { icon: BarChart3, label: "Learning Analytics" },
  { icon: ClipboardCheck, label: "Academic Operations" },
  { icon: ChartSpline, label: "Performance Insights" },
  { icon: ShieldCheck, label: "Secure Cloud Platform" },
];

const stakeholders = [
  {
    icon: Users,
    title: "Administrator",
    text: "Manage users, classes, teachers, students, examinations, reports, and institutional operations through a centralized administrative dashboard.",
  },
  {
    icon: GraduationCap,
    title: "Teacher",
    text: "Record attendance and marks, review essay submissions with guided feedback, monitor student performance, and generate academic reports.",
  },
  {
    icon: BookOpen,
    title: "Student",
    text: "Review examination results, monitor academic progress, get study guidance, and access personalised learning recommendations.",
  },
  {
    icon: School,
    title: "Parent",
    text: "Track attendance, examination performance, and academic reports — with timely notifications when extra support may help.",
  },
];

const whyChoose = [
  {
    icon: BarChart3,
    title: "Learning Analytics",
    text: "Visual dashboards provide meaningful insights into student performance and classroom progress.",
  },
  {
    icon: Bot,
    title: "Essay Evaluation Support",
    text: "Review descriptive answers faster with constructive feedback teachers can approve or adjust.",
  },
  {
    icon: BrainCircuit,
    title: "Early Risk Alerts",
    text: "Identify students who may need support using attendance and examination performance patterns.",
  },
  {
    icon: ClipboardCheck,
    title: "Attendance Management",
    text: "Record attendance efficiently while monitoring attendance trends and engagement levels.",
  },
  {
    icon: ChartSpline,
    title: "Performance Tracking",
    text: "Monitor examination performance through reports, rankings, and academic progress indicators.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Role-Based Access",
    text: "Separate dashboards ensure every stakeholder accesses only the information relevant to their responsibilities.",
  },
];

const stats = [
  { value: "4+", label: "User Roles" },
  { value: "10+", label: "Academic Features" },
  { value: "Fast", label: "Essay Review" },
  { value: "Early", label: "Risk Alerts" },
];

const aboutHighlights = [
  "Designed for Sri Lankan GCE A/L Commerce academic workflows",
  "One platform connecting administrators, teachers, students, and parents",
  "Clear dashboards focused on real academic responsibilities",
  "Attendance, examinations, and progress insights in one place",
  "Guided essay review that keeps teachers in control of final marks",
  "Early alerts that help schools support students sooner",
];

function AboutPage() {
  return (
    <div className="public-site bg-white text-slate-900">
      {/* 1. Hero */}
      <section className="relative overflow-hidden border-b border-sky-100 bg-gradient-to-b from-[#e8f4fc] via-[#f3f9fd] to-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(14,165,233,0.14),_transparent_55%)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">
              About
            </p>
            <h1 className="typo-section mt-4 tracking-tight text-balance text-slate-950">
              Empowering Sri Lankan A/L Commerce Education with Clearer Academic
              Insight
            </h1>
            <p className="typo-body mx-auto mt-6 max-w-2xl text-pretty text-slate-600">
              EduTrack is an academic management platform that brings attendance
              tracking, examination management, learning analytics, essay review
              support, and early progress alerts together for administrators,
              teachers, students, and parents in one secure system.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Mission — Light Gray */}
      <section className="border-b border-slate-200 bg-[#f3f4f6]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-8 lg:py-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">
              Our Mission
            </p>
            <h2 className="typo-section mt-3 tracking-tight text-slate-950">
              Transforming Academic Management Through Better Technology
            </h2>
          </div>
          <div className="space-y-5">
            <p className="typo-body text-slate-600">
              Traditional school administration often relies on multiple
              disconnected systems, manual record keeping, and repetitive
              administrative work. EduTrack centralizes academic information into
              one platform, helping institutions improve efficiency, strengthen
              collaboration, and make informed decisions with up-to-date data.
            </p>
            <p className="typo-body text-slate-600">
              Designed specifically for Sri Lankan GCE Advanced Level Commerce
              education, the platform helps teams improve academic performance,
              spot learning challenges earlier, and support evidence-based
              educational decisions.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Core Principles — White */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <h2 className="typo-section max-w-2xl tracking-tight text-slate-950">
            Core Principles
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {principles.map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="border border-slate-200 bg-[#fafafa] p-6 transition hover:border-sky-300"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-sky-50 text-sky-700">
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </span>
                <h3 className="typo-card mt-5 text-slate-950">{title}</h3>
                <p className="typo-body mt-3 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Technology — Light Blue */}
      <section className="border-b border-slate-200 bg-[#eef5fb]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <h2 className="typo-section max-w-3xl tracking-tight text-slate-950">
            Built with Modern Educational Technology
          </h2>
          <p className="typo-body mt-4 max-w-3xl text-slate-600">
            EduTrack combines interactive dashboards, secure web technologies,
            and smart academic tools to improve day-to-day administration and
            student success.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {technologies.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-4 border border-sky-100 bg-white/80 px-5 py-4"
              >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-sky-100 text-sky-700">
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </span>
                <p className="text-sm font-semibold text-slate-900">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Stakeholders — White */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <h2 className="typo-section max-w-3xl tracking-tight text-slate-950">
            Supporting Every Member of the School Community
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2">
            {stakeholders.map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="border-t border-slate-200 pt-6"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <h3 className="typo-card text-slate-950">{title}</h3>
                </div>
                <p className="typo-body mt-4 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Why Choose — Light Gray */}
      <section className="border-b border-slate-200 bg-[#f3f4f6]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <h2 className="typo-section max-w-3xl tracking-tight text-slate-950">
            Why Choose Smart Learning System
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {whyChoose.map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="border border-slate-200 bg-white p-6"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-sky-50 text-sky-700">
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </span>
                <h3 className="typo-card mt-5 text-slate-950">{title}</h3>
                <p className="typo-body mt-3 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Statistics — White */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className={`text-center sm:text-left ${
                  index < stats.length - 1
                    ? "lg:border-r lg:border-slate-200 lg:pr-8"
                    : ""
                }`}
              >
                <p className="text-4xl font-bold tracking-tight text-slate-950">
                  {stat.value}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Commitment — dark highlight section */}
      <section className="border-b border-slate-800 bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:px-8 lg:py-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-400">
              Built with academic purpose
            </p>

            <h2 className="typo-section mt-3 tracking-tight">
              A clearer way to manage learning, progress, and school collaboration
            </h2>

            <p className="typo-body mt-5 max-w-xl text-slate-300">
              EduTrack was created to reduce fragmented academic work and give
              every stakeholder a focused view of what matters: attendance,
              performance, and timely support for students.
            </p>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2">
            {aboutHighlights.map((line) => (
              <li
                key={line}
                className="flex gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-400">
                  <Check className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-sm leading-6 text-slate-200">{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 8. CTA — Light Blue */}
      <section className="bg-[#eef5fb]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <h2 className="typo-section max-w-3xl tracking-tight text-slate-950">
            Experience Smarter Academic Management
          </h2>
          <p className="typo-body mt-4 max-w-2xl text-slate-600">
            Discover how clearer analytics, guided essay review, and early
            progress alerts can improve educational outcomes while simplifying
            everyday academic administration.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <NavLink
              to="/features"
              className="rounded-md bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-800"
            >
              Explore Features
            </NavLink>
            <NavLink
              to="/login"
              className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Sign In
            </NavLink>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AboutPage;
