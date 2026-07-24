import {
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  CalendarCheck2,
  Check,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  LockKeyhole,
  MessageSquareText,
  School,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCog,
  Users,
} from "lucide-react";

import PublicPageHero from "../../components/PublicPageHero";
import PublicFinalCta from "../../components/PublicFinalCta";

const featureGroups = [
  {
    eyebrow: "Academic operations",
    title: "Manage everyday school workflows from one place",
    description:
      "Bring users, classes, attendance, examinations, and academic records together in a structured workspace designed for efficient school administration.",
    items: [
      {
        icon: UserCog,
        title: "User and role management",
        text: "Create and manage administrator, teacher, student, and parent accounts with secure role-based permissions.",
      },
      {
        icon: School,
        title: "Classes and subjects",
        text: "Organise Commerce classes, subjects, student enrolments, and teacher assignments from a central dashboard.",
      },
      {
        icon: CalendarCheck2,
        title: "Attendance management",
        text: "Record daily attendance, review attendance history, and identify patterns that may affect academic progress.",
      },
      {
        icon: ClipboardList,
        title: "Examination management",
        text: "Create examinations, assign subjects, define assessment details, and maintain structured academic records.",
      },
      {
        icon: BookOpenCheck,
        title: "Marks and results",
        text: "Enter student marks and automatically present grades, rankings, averages, and subject-level performance.",
      },
      {
        icon: FileText,
        title: "Progress reports",
        text: "Generate clear academic reports that combine examination results, attendance, performance trends, and risk status.",
      },
    ],
  },
  {
    eyebrow: "Learning intelligence",
    title: "Turn academic data into meaningful insight",
    description:
      "Use analytics and smart support tools to make faster academic decisions and intervene earlier when students need help.",
    items: [
      {
        icon: Sparkles,
        title: "Essay evaluation support",
        text: "Analyse descriptive answers, highlight important ideas, suggest marks, and provide feedback teachers can review.",
      },
      {
        icon: BrainCircuit,
        title: "Early risk alerts",
        text: "Review attendance and academic performance to identify students who may require additional support.",
      },
      {
        icon: LineChart,
        title: "Performance trends",
        text: "Track changes in marks over time and make improving or declining academic patterns easier to recognise.",
      },
      {
        icon: BarChart3,
        title: "Interactive analytics",
        text: "Use charts, summaries, and dashboard indicators to review class and individual student performance quickly.",
      },
      {
        icon: TrendingUp,
        title: "Rankings and academic indicators",
        text: "Present rankings, averages, pass rates, and other performance indicators through clear visual summaries.",
      },
      {
        icon: MessageSquareText,
        title: "Learning support",
        text: "Provide students with guided explanations, revision assistance, and subject-focused academic support.",
      },
    ],
  },
  {
    eyebrow: "Students and families",
    title: "Keep learners and parents informed",
    description:
      "Give students and parents secure access to the information they need while maintaining clear boundaries between school roles.",
    items: [
      {
        icon: GraduationCap,
        title: "Student dashboard",
        text: "Allow students to view marks, examination history, progress trends, learning feedback, and revision support.",
      },
      {
        icon: Users,
        title: "Parent visibility",
        text: "Give parents access to their child’s attendance, examination results, progress reports, and academic status.",
      },
      {
        icon: BrainCircuit,
        title: "Early progress alerts",
        text: "Notify authorised users when attendance and performance patterns suggest a student may need support.",
      },
      {
        icon: FileText,
        title: "Accessible progress reports",
        text: "Present academic progress through structured reports that are easy for students and parents to understand.",
      },
      {
        icon: BookOpenCheck,
        title: "Revision guidance",
        text: "Help students focus their study plans using subject performance, assessment results, and learning feedback.",
      },
      {
        icon: LockKeyhole,
        title: "Private information access",
        text: "Ensure students and parents can only access records connected to their own authorised profiles.",
      },
    ],
  },
];

const platformBenefits = [
  {
    icon: LayoutDashboard,
    title: "Focused dashboards",
    text: "Each role receives a workspace designed around its real responsibilities.",
  },
  {
    icon: ShieldCheck,
    title: "Secure access",
    text: "Protected routes and role-based permissions keep academic information controlled.",
  },
  {
    icon: BarChart3,
    title: "Clear reporting",
    text: "Charts, summaries, and structured reports make academic data easier to review.",
  },
  {
    icon: Sparkles,
    title: "Smart assistance",
    text: "Helpful tools support educators while keeping final academic judgement with people.",
  },
];

const implementationHighlights = [
  "Role-based dashboards for administrators, teachers, students, and parents",
  "Responsive interfaces designed for desktop, tablet, and mobile use",
  "Structured forms and tables for efficient academic data entry",
  "Secure sign-in, password recovery, and protected system routes",
  "Real-time summaries for attendance, examinations, and student performance",
  "Essay review tools that keep teachers in control of final marks",
];

function FeatureCard({ icon: Icon, title, text }) {
  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-lg">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700 transition group-hover:bg-sky-700 group-hover:text-white">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>

      <h3 className="typo-card mt-5 text-slate-950">{title}</h3>

      <p className="typo-body mt-3 text-slate-600">{text}</p>
    </article>
  );
}

function FeaturesPage() {
  return (
    <div className="public-site bg-[#f4f7fb]">
      <PublicPageHero
        eyebrow="Platform features"
        title="One platform for modern academic management"
        subtitle="EduTrack connects attendance, examinations, analytics, essay review support, early progress alerts, and parent visibility in one secure system designed for Sri Lankan GCE Advanced Level Commerce education."
      />

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">
                Connected by design
              </p>

              <h2 className="typo-section mt-3 max-w-2xl tracking-tight text-slate-950">
                From classroom records to informed academic action
              </h2>
            </div>

            <p className="typo-body max-w-2xl text-slate-600 lg:justify-self-end">
              EduTrack reduces fragmented record keeping by connecting daily
              academic operations with clear analysis. Teachers can record data
              once, while authorised users receive the views, reports, and alerts
              relevant to their responsibilities.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {platformBenefits.map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-6"
              >
                <Icon className="h-6 w-6 text-sky-700" aria-hidden="true" />

                <h3 className="mt-5 text-base font-semibold text-slate-950">
                  {title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {featureGroups.map((group, index) => (
        <section
          key={group.title}
          className={`border-b border-slate-200 ${
            index % 2 === 0 ? "bg-[#f4f7fb]" : "bg-white"
          }`}
        >
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">
                {group.eyebrow}
              </p>

              <h2 className="typo-section mt-3 tracking-tight text-slate-950">
                {group.title}
              </h2>

              <p className="typo-body mt-4 text-slate-600">
                {group.description}
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {group.items.map((item) => (
                <FeatureCard
                  key={item.title}
                  icon={item.icon}
                  title={item.title}
                  text={item.text}
                />
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="border-b border-slate-800 bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:px-8 lg:py-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-400">
              Built for real school use
            </p>

            <h2 className="typo-section mt-3 tracking-tight">
              Practical workflows, secure access, and reliable academic insight
            </h2>

            <p className="typo-body mt-5 max-w-xl text-slate-300">
              The platform is designed to support everyday academic work, not
              only demonstrations. Clear navigation and structured workflows
              make core tasks easier for every authorised user.
            </p>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2">
            {implementationHighlights.map((line) => (
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

      <PublicFinalCta
        title="Bring academic operations and clear insight together"
        text="Sign in to access your role-based dashboard, or contact the EduTrack team to learn how the platform supports administrators, teachers, students, and parents."
      />
    </div>
  );
}

export default FeaturesPage;