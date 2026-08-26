/**
 * Shared Previous | 1 | 2 | 3 | Next controls for dashboard tables.
 */
function buildPageList(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage]);
  for (let offset = -1; offset <= 1; offset += 1) {
    const page = currentPage + offset;
    if (page >= 1 && page <= totalPages) pages.add(page);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const withGaps = [];

  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) {
      withGaps.push("…");
    }
    withGaps.push(page);
  });

  return withGaps;
}

function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}) {
  if (totalItems <= pageSize) return null;

  const pages = buildPageList(currentPage, totalPages);
  const from = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-medium text-slate-500">
        Showing {from}–{to} of {totalItems}
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        <PaginationButton
          label="Previous"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        />

        {pages.map((page, index) =>
          page === "…" ? (
            <span
              key={`gap-${index}`}
              className="px-2 text-sm font-semibold text-slate-400"
            >
              …
            </span>
          ) : (
            <PaginationButton
              key={page}
              label={String(page)}
              active={page === currentPage}
              onClick={() => onPageChange(page)}
            />
          )
        )}

        <PaginationButton
          label="Next"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        />
      </div>
    </div>
  );
}

function PaginationButton({ label, onClick, disabled = false, active = false }) {
  const base =
    "rounded-lg px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";
  const tone = active
    ? "bg-blue-700 text-white shadow-sm"
    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${tone}`}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </button>
  );
}

export default TablePagination;
