// Formats a Date as a UTC `YYYY-MM-DD` string.
export function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
