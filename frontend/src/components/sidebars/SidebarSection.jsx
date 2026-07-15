import { NavLink } from "react-router-dom";

function SidebarSection({ title, items }) {
  return (
    <section className="space-y-1">
      {title && (
        <p className="px-3 pt-4 pb-1 text-xs font-bold uppercase tracking-wide text-slate-400">
          {title}
        </p>
      )}

      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `block rounded-md px-3 py-2 text-sm font-semibold transition ${
              isActive
                ? "bg-blue-50 text-blue-700"
                : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </section>
  );
}

export default SidebarSection;
