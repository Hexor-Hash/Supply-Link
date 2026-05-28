import { useMemo, useState } from 'react';

export function usePaginatedList<T>(items: T[], initialPageSize = 20) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const safePage = Math.min(page, totalPages - 1);

  const pageItems = useMemo(
    () => items.slice(safePage * pageSize, safePage * pageSize + pageSize),
    [items, safePage, pageSize],
  );

  function goToPage(p: number) {
    setPage(Math.max(0, Math.min(p, totalPages - 1)));
  }

  function changePageSize(size: number) {
    setPageSize(size);
    setPage(0);
  }

  return {
    pageItems,
    page: safePage,
    pageSize,
    total,
    totalPages,
    goToPage,
    changePageSize,
  };
}
