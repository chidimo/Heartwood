/** "15/06/2012" (or "5/6/2012") -> "2012-06-15"; null when it isn't a real date. */
export const parseDateInput = (text: string): string | null => {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const real =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!real) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/** "2012-06-15" -> "15/06/2012". */
export const formatDateInput = (iso: string): string => {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** A Date's calendar day as "YYYY-MM-DD", read in local time so the day the person picked never shifts. */
export const isoFromDate = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** "2012-06-15" -> that day at local midnight. */
export const dateFromIso = (iso: string): Date => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "2012-06-15" -> "Friday, 15 June 2012": the one way a date is written in the app and its documents. */
export const formatLongDate = (iso: string): string => {
  const [year, month, day] = iso.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${weekday}, ${day} ${MONTHS[month - 1]} ${year}`;
};

// The app is for Nigeria, so a moment reads in Lagos time whatever the device or server clock says.
const TIMESTAMP = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Lagos',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h12',
});

/** A moment as "Wednesday, 11 November 2026 at 2:32:09 pm", in Lagos time. Use it wherever a time is shown. */
export const formatTimestamp = (date: Date): string => {
  const parts = TIMESTAMP.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(p => p.type === type)?.value ?? '';
  const clock = `${part('hour')}:${part('minute')}:${part('second')} ${part('dayPeriod').toLowerCase()}`;
  return `${part('weekday')}, ${part('day')} ${part('month')} ${part('year')} at ${clock}`;
};
