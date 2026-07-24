import { NavLink } from "react-router-dom";

/**
 * Shared closing CTA for public marketing pages.
 */
function PublicFinalCta({ title, text }) {
  return (
    <section className="bg-[#eef5fb]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <h2 className="typo-section max-w-3xl tracking-tight text-slate-950">
          {title}
        </h2>
        <p className="typo-body mt-4 max-w-2xl text-slate-600">{text}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <NavLink
            to="/login"
            className="rounded-md bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-800"
          >
            Sign in
          </NavLink>
          <NavLink
            to="/contact"
            className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Contact us
          </NavLink>
        </div>
      </div>
    </section>
  );
}

export default PublicFinalCta;
