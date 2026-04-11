/** Backend origin for server-side SEO fetches (matches `app/api/news` route handlers). */
export function getServerBackendOrigin(): string {
  return (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:6001').replace(/\/$/, '');
}
