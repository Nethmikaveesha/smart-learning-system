import { NavLink } from "react-router-dom";

const legalPages = {
  privacy: {
    title: "Privacy Policy",
    updated: "July 2026",
    sections: [
      {
        heading: "Overview",
        text: "EduTrack collects and processes academic information to support school administration, teaching, learning, and parent engagement. This policy explains how personal data is handled within the platform.",
      },
      {
        heading: "Information we process",
        text: "Depending on your role, EduTrack may store account details, attendance records, examination results, progress reports, and support-related messages needed to operate the service.",
      },
      {
        heading: "How information is used",
        text: "Data is used to provide role-based dashboards, generate academic reports, support essay review workflows, and deliver early progress alerts to authorised users.",
      },
      {
        heading: "Access and control",
        text: "Access is limited by role. Students and parents can only view information connected to their authorised profiles. Institutional administrators manage user accounts for their organisation.",
      },
      {
        heading: "Contact",
        text: "For privacy questions, contact support@edutrack.lk.",
      },
    ],
  },
  terms: {
    title: "Terms of Use",
    updated: "July 2026",
    sections: [
      {
        heading: "Acceptance",
        text: "By signing in to EduTrack, you agree to use the platform only for authorised academic and administrative purposes set by your institution.",
      },
      {
        heading: "Accounts",
        text: "Accounts are created and managed by institutional administrators. You are responsible for keeping your login credentials secure and for activity carried out under your account.",
      },
      {
        heading: "Acceptable use",
        text: "Users must not attempt to access records outside their role permissions, disrupt platform services, or misuse academic data for unauthorised purposes.",
      },
      {
        heading: "Service availability",
        text: "EduTrack aims to provide reliable access to academic workflows, but availability may vary during maintenance or unforeseen technical issues.",
      },
      {
        heading: "Contact",
        text: "For terms-related questions, contact support@edutrack.lk.",
      },
    ],
  },
  "data-protection": {
    title: "Data Protection",
    updated: "July 2026",
    sections: [
      {
        heading: "Protection principles",
        text: "EduTrack is designed to keep academic information secure through role-based access, authenticated sessions, and controlled dashboard visibility.",
      },
      {
        heading: "Institutional responsibility",
        text: "Schools and administrators remain responsible for creating accurate user accounts, assigning correct roles, and managing access for their institution.",
      },
      {
        heading: "Security practices",
        text: "Passwords are stored using industry-standard hashing, and password recovery uses one-time reset links. Users should protect devices and credentials used to access EduTrack.",
      },
      {
        heading: "Data requests",
        text: "Requests related to account correction or access should be directed to your institution administrator, or to support@edutrack.lk when appropriate.",
      },
    ],
  },
  accessibility: {
    title: "Accessibility",
    updated: "July 2026",
    sections: [
      {
        heading: "Our commitment",
        text: "EduTrack aims to provide a clear, usable experience across public pages and role-based dashboards for a wide range of users.",
      },
      {
        heading: "Design approach",
        text: "The interface uses readable typography, consistent navigation, keyboard-focusable controls, and responsive layouts for desktop and mobile devices.",
      },
      {
        heading: "Continuous improvement",
        text: "We continue refining contrast, form labels, and interactive states so academic workflows remain easier to complete for all authorised users.",
      },
      {
        heading: "Feedback",
        text: "If you encounter an accessibility barrier, contact support@edutrack.lk and include the page or workflow involved.",
      },
    ],
  },
};

function LegalPage({ page = "privacy" }) {
  const content = legalPages[page] || legalPages.privacy;

  return (
    <div className="public-site bg-white">
      <section className="border-b border-slate-200 bg-[#f8fafc]">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">
            Legal
          </p>
          <h1 className="typo-section mt-3 tracking-tight text-slate-950">
            {content.title}
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            Last updated: {content.updated}
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-3xl space-y-10 px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          {content.sections.map((section) => (
            <article key={section.heading}>
              <h2 className="text-xl font-semibold text-slate-950">
                {section.heading}
              </h2>
              <p className="typo-body mt-3 text-slate-600">{section.text}</p>
            </article>
          ))}

          <div className="border-t border-slate-200 pt-8">
            <NavLink
              to="/contact"
              className="text-sm font-semibold text-sky-700 transition hover:text-sky-800"
            >
              Contact EduTrack support
            </NavLink>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LegalPage;
