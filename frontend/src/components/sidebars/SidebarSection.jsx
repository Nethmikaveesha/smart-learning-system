import { NavLink } from "react-router-dom";

function SidebarSection({ title, items }) {
  return (
    <section className="space-y-1">
      {title && (
        <p className="px-3 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          {title}
        </p>
      )}

      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-bold transition ${
              isActive
                ? "bg-blue-700 text-white shadow-sm"
                : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className="truncate">{item.label}</span>
              <span
                className={
                  isActive
                    ? "h-2 w-2 rounded-full bg-white"
                    : "h-2 w-2 rounded-full bg-transparent group-hover:bg-slate-300"
                }
              />
            </>
          )}
        </NavLink>
      ))}
    </section>
  );
}

export default SidebarSection;