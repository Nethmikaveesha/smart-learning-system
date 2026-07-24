/**
 * Shared hero block for public marketing pages — balanced, centered composition.
 */
function PublicPageHero({ eyebrow, title, subtitle, actions }) {
  return (
    <section className="relative overflow-hidden border-b border-sky-100 bg-gradient-to-b from-[#e8f4fc] via-[#f3f9fd] to-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(14,165,233,0.14),_transparent_55%)]"
      />
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">
            {eyebrow}
          </p>
          <h1 className="typo-section mt-3 tracking-tight text-balance text-slate-950">
            {title}
          </h1>
          <p className="typo-body mx-auto mt-5 max-w-2xl text-pretty text-slate-600">
            {subtitle}
          </p>
          {actions ? (
            <div className="mt-8 flex flex-wrap justify-center gap-3">{actions}</div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default PublicPageHero;
