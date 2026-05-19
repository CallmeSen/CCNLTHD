export const APP_TIME_ZONE = 'Asia/Bangkok';

type DateInput = string | number | Date | null | undefined;

const OFFSET_PATTERN = /(Z|[+-]\d{2}:?\d{2})$/i;
const ISO_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}[T\s]/;

function normalizeTimestampString(value: string) {
  let normalized = value.trim();
  if (!normalized) return normalized;

  normalized = normalized.replace(' ', 'T');
  normalized = normalized.replace(/(\.\d{3})\d+/, '$1');

  if (ISO_DATE_TIME_PATTERN.test(normalized) && !OFFSET_PATTERN.test(normalized)) {
    return `${normalized}Z`;
  }

  return normalized;
}

export function parseAppTimestamp(value: DateInput, fallback = Date.now()) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? fallback : time;
  }

  const parsed = Date.parse(normalizeTimestampString(value));
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function formatAppDateTime(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = {},
) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: APP_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  }).format(new Date(parseAppTimestamp(value)));
}

export function formatAppTime(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = {},
) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: APP_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  }).format(new Date(parseAppTimestamp(value)));
}
