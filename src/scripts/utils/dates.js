const DATE_FORMATTER = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
});

const TIME_FORMATTER = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
});

export function toDate(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value) {
  const date = toDate(value);
  return date ? DATE_FORMATTER.format(date) : "—";
}

export function formatDateTime(dateValue, timeValue = "00:00") {
  if (!dateValue) {
    return "—";
  }
  const date = toDate(`${dateValue}T${timeValue}`);
  if (!date) {
    return "—";
  }
  return `${DATE_FORMATTER.format(date)} · ${TIME_FORMATTER.format(date)}`;
}

export function clampDateRange(days) {
  const safeDays = Math.max(1, Number(days) || 1);
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - (safeDays - 1));
  return { start, end };
}

export function isWithinRange(value, range) {
  const date = toDate(`${value}T00:00:00`);
  if (!date || !range) {
    return false;
  }
  return date >= range.start && date <= range.end;
}
