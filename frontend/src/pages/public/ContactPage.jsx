import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Headphones,
  Mail,
  MapPinned,
  MessageCircle,
  Phone,
  ShieldCheck,
} from "lucide-react";

const quickContacts = [
  {
    icon: Mail,
    label: "Email",
    value: "support@edutrack.lk",
    href: "mailto:support@edutrack.lk",
  },
  {
    icon: Headphones,
    label: "Technical Support",
    value: "tech@edutrack.lk",
    href: "mailto:tech@edutrack.lk",
  },
  {
    icon: Clock3,
    label: "Office Hours",
    value: "Mon – Fri",
  },
  {
    icon: MapPinned,
    label: "Location",
    value: "Colombo, Sri Lanka",
  },
];

const whyContact = [
  {
    icon: Headphones,
    title: "Technical Support",
    text: "Get help with sign-in issues, dashboard access, and platform troubleshooting.",
  },
  {
    icon: ShieldCheck,
    title: "Account Assistance",
    text: "Request guidance on user roles, password recovery, and account setup.",
  },
  {
    icon: MessageCircle,
    title: "Product Demo",
    text: "See how EduTrack supports administrators, teachers, students, and parents.",
  },
  {
    icon: Mail,
    title: "General Inquiry",
    text: "Ask about features, onboarding, partnerships, or anything else about EduTrack.",
  },
];

const faqs = [
  {
    question: "How do I reset my password?",
    answer:
      "Open the Sign In page and select Forgot password. Enter your email to receive a secure reset link, then set a new password.",
  },
  {
    question: "How can I request a demo?",
    answer:
      "Use the contact form and choose the Demo category, or email support@edutrack.lk. Our team will arrange a walkthrough of the platform.",
  },
  {
    question: "Can parents create accounts?",
    answer:
      "Parent accounts are created and managed by the institution administrator. Contact your school admin or reach out to us for onboarding support.",
  },
  {
    question: "How do teachers evaluate essays?",
    answer:
      "Teachers can review descriptive answers with guided essay feedback, then confirm or adjust marks from their dashboard.",
  },
  {
    question: "Who can access reports?",
    answer:
      "Access is role-based. Administrators and teachers see institutional and class reports, while students and parents view information relevant to their accounts.",
  },
];

const categories = ["General", "Technical", "Demo", "Partnership", "Other"];

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    category: "General",
    message: "",
  });
  const [status, setStatus] = useState({ type: "", text: "" });
  const [sending, setSending] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setStatus({
        type: "error",
        text: "Please complete required fields.",
      });
      return;
    }

    setSending(true);
    setStatus({ type: "", text: "" });

    const body = [
      `Name: ${form.name.trim()}`,
      `Email: ${form.email.trim()}`,
      `Category: ${form.category}`,
      "",
      form.message.trim(),
    ].join("\n");

    const mailto = `mailto:support@edutrack.lk?subject=${encodeURIComponent(
      `[${form.category}] ${form.subject.trim() || "EduTrack inquiry"}`
    )}&body=${encodeURIComponent(body)}`;

    window.location.href = mailto;

    setStatus({
      type: "success",
      text: "Message Ready",
    });
    setForm({
      name: "",
      email: "",
      subject: "",
      category: "General",
      message: "",
    });
    setSending(false);
  };

  return (
    <div className="public-site bg-white text-slate-900">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-sky-100 bg-gradient-to-b from-[#e8f4fc] via-[#f3f9fd] to-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(14,165,233,0.14),_transparent_55%)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">
              Contact
            </p>
            <h1 className="typo-section mt-4 tracking-tight text-balance text-slate-950">
              Contact EduTrack
            </h1>
            <p className="mt-3 text-xl font-semibold text-slate-800">
              We&apos;re ready to support your academic journey.
            </p>
            <p className="typo-body mx-auto mt-5 max-w-2xl text-pretty text-slate-600">
              Whether you have questions about the platform, need technical
              assistance, or would like to learn more about EduTrack, our team is
              ready to help.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Contact Cards — Gray */}
      <section className="border-b border-slate-200 bg-[#f3f4f6]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {quickContacts.map(({ icon: Icon, label, value, href }) => (
              <article
                key={label}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </span>
                <p className="mt-5 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {label}
                </p>
                {href ? (
                  <a
                    href={href}
                    className="mt-2 block text-base font-semibold text-slate-950 transition hover:text-sky-700"
                  >
                    {value}
                  </a>
                ) : (
                  <p className="mt-2 text-base font-semibold text-slate-950">
                    {value}
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form + Office Info — White */}
      <section
        id="contact-form"
        className="scroll-mt-24 border-b border-slate-200 bg-white"
      >
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12 lg:px-8 lg:py-20">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 sm:p-8">
            <h2 className="typo-card text-slate-950">Send us a message</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Complete the form below and our team will respond as soon as
              possible.
            </p>

            {status.text ? (
              <div
                role="alert"
                className={`mt-5 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${
                  status.type === "error"
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800"
                }`}
              >
                {status.type === "error" ? (
                  <CircleAlert className="h-4 w-4 shrink-0" aria-hidden />
                ) : (
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                )}
                {status.type === "error"
                  ? `⚠ ${status.text}`
                  : `✓ ${status.text}`}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
              <label className="block text-sm font-semibold text-slate-700">
                Name
                <input
                  type="text"
                  value={form.name}
                  onChange={updateField("name")}
                  placeholder="Your name"
                  autoComplete="name"
                  className={inputClass}
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={updateField("email")}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className={inputClass}
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Subject
                <input
                  type="text"
                  value={form.subject}
                  onChange={updateField("subject")}
                  placeholder="How can we help?"
                  className={inputClass}
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Category
                <select
                  value={form.category}
                  onChange={updateField("category")}
                  className={inputClass}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Message
                <textarea
                  value={form.message}
                  onChange={updateField("message")}
                  placeholder="Share a few details so we can respond accurately."
                  rows={5}
                  className={`${inputClass} resize-y`}
                />
              </label>

              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition hover:scale-105 hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-sky-300 disabled:hover:scale-100"
              >
                {sending ? "Preparing..." : "Send Inquiry"}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </form>
          </div>

          <aside className="space-y-8 rounded-3xl border border-slate-200 bg-[#f8fafc] p-6 sm:p-8">
            <div>
              <h3 className="typo-card text-slate-950">Office Information</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Reach us directly using the details below.
              </p>
            </div>

            <div className="space-y-6">
              <OfficeItem
                icon={MapPinned}
                label="Office Address"
                lines={["EduTrack", "Colombo", "Sri Lanka"]}
              />
              <OfficeItem
                icon={Phone}
                label="Phone"
                lines={["+94 11 3913213"]}
                href="tel:+94113913213"
              />
              <OfficeItem
                icon={Clock3}
                label="Working Hours"
                lines={["Monday – Friday", "8:30 AM – 5:00 PM"]}
              />
              <OfficeItem
                icon={MessageCircle}
                label="Average Response"
                lines={["Within 24 Hours"]}
              />
            </div>
          </aside>
        </div>
      </section>

      {/* Why Contact Us — Blue */}
      <section className="border-b border-slate-200 bg-[#eef5fb]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <h2 className="typo-section tracking-tight text-slate-950">
            Why Contact Us
          </h2>
          <p className="typo-body mt-4 max-w-2xl text-slate-600">
            Choose the path that matches your needs — support, demos, or general
            questions about EduTrack.
          </p>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {whyContact.map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </span>
                <h3 className="typo-card mt-5 text-slate-950">{title}</h3>
                <p className="typo-body mt-3 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ — White */}
      <section
        id="faq"
        className="scroll-mt-24 border-b border-slate-200 bg-white"
      >
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <h2 className="typo-section tracking-tight text-slate-950">
            Frequently Asked Questions
          </h2>
          <p className="typo-body mt-4 text-slate-600">
            Quick answers to the questions we hear most often.
          </p>

          <div className="mt-10 divide-y divide-slate-200 rounded-3xl border border-slate-200 bg-[#fafafa]">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={faq.question} className="px-5 sm:px-6">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() =>
                      setOpenFaq((current) => (current === index ? -1 : index))
                    }
                    className="flex w-full items-center justify-between gap-4 py-5 text-left"
                  >
                    <span className="text-base font-semibold text-slate-950">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-slate-500 transition ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden
                    />
                  </button>
                  {isOpen ? (
                    <p className="pb-5 text-sm leading-7 text-slate-600">
                      {faq.answer}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Map — Gray */}
      <section className="border-b border-slate-200 bg-[#f3f4f6]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="typo-section tracking-tight text-slate-950">
                Our Location
              </h2>
              <p className="typo-body mt-3 text-slate-600">
                Colombo, Sri Lanka
              </p>
            </div>
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <MapPinned className="h-4 w-4 text-sky-700" aria-hidden />
              EduTrack Headquarters
            </p>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
            <iframe
              title="EduTrack location — Colombo, Sri Lanka"
              src="https://www.google.com/maps?q=Colombo,+Sri+Lanka&output=embed"
              className="h-72 w-full border-0 sm:h-96"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[#eef5fb]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <h2 className="typo-section max-w-3xl tracking-tight text-slate-950">
            Still have questions?
          </h2>
          <p className="typo-body mt-4 max-w-2xl text-slate-600">
            Let&apos;s start a conversation.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#contact-form"
              className="inline-flex items-center gap-2 rounded-md bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-800"
            >
              Contact Team
              <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
            <NavLink
              to="/features"
              className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Explore Platform
            </NavLink>
          </div>
        </div>
      </section>
    </div>
  );
}

function OfficeItem({ icon: Icon, label, lines, href }) {
  return (
    <div className="border-t border-slate-200 pt-5 first:border-t-0 first:pt-0">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-sky-700 shadow-sm">
          <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {label}
          </p>
          {lines.map((line) =>
            href ? (
              <a
                key={line}
                href={href}
                className="mt-1 block text-sm font-semibold text-slate-900 transition hover:text-sky-700"
              >
                {line}
              </a>
            ) : (
              <p key={line} className="mt-1 text-sm font-semibold text-slate-900">
                {line}
              </p>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default ContactPage;
