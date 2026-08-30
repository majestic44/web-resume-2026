export function formatCredentialDate(value) {
  if (!value) return '';

  const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
  if (!match) return String(value);

  const [year, month, day] = match[0].split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
