export const ROWS_PER_PAGE_OPTIONS = [20, 50, 100];

/** Server pagination uses one-based pages, including the empty result state. */
export const getPageNumber = (value, totalPages) => {
  const page = Number(value);
  if (!Number.isFinite(page)) {
    return 1;
  }
  return Math.max(1, Math.min(Math.max(1, totalPages), Math.trunc(page)));
};
