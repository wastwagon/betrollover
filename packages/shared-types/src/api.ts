/**
 * Common API shapes (errors, pagination).
 */

/** RFC 7807–style problem detail (optional; API may use this format). */
export interface ApiErrorDetail {
  statusCode: number;
  message: string | string[];
  error?: string;
  path?: string;
  timestamp?: string;
}

export interface PaginatedMeta {
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}
