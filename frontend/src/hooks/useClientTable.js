import { useEffect, useMemo, useState } from "react";

const DEFAULT_PAGE_SIZE = 10;

function rowMatchesQuery(row, query, columns) {
  if (!query) return true;

  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  const keys =
    Array.isArray(columns) && columns.length > 0
      ? columns
      : Object.keys(row || {});

  return keys.some((key) => {
    const value = row?.[key];
    if (value == null) return false;
    if (typeof value === "object") {
      try {
        return JSON.stringify(value).toLowerCase().includes(needle);
      } catch {
        return false;
      }
    }
    return String(value).toLowerCase().includes(needle);
  });
}

/**
 * Client-side search + pagination for dashboard tables.
 * Search/filter changes always reset to page 1.
 */
export default function useClientTable(
  rows,
  { pageSize = DEFAULT_PAGE_SIZE, columns = [] } = {}
) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredRows = useMemo(
    () =>
      (Array.isArray(rows) ? rows : []).filter((row) =>
        rowMatchesQuery(row, searchQuery, columns)
      ),
    [columns, rows, searchQuery]
  );

  const totalItems = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize) || 1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, rows, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pageRows = filteredRows.slice(startIndex, startIndex + pageSize);

  return {
    searchQuery,
    setSearchQuery,
    currentPage: safePage,
    setCurrentPage,
    pageRows,
    filteredRows,
    totalItems,
    totalPages,
    pageSize,
    startIndex,
  };
}
