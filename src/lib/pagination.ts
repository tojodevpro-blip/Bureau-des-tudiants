export type PaginationInput = {
  page?: number;
  pageSize?: number;
};

export function parsePagination(input: PaginationInput, defaultSize = 20) {
  const page = Math.max(1, Math.floor(Number(input.page) || 1));
  const pageSize = Math.min(50, Math.max(1, Math.floor(Number(input.pageSize) || defaultSize)));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function totalPages(total: number, pageSize: number) {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function pageWindow(page: number, total: number) {
  const start = Math.max(1, Math.min(page - 2, total - 4));
  const end = Math.min(total, start + 4);
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
}
