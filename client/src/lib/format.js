export const time = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';

export const dateShort = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';

export const dateLong = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : '';

export const dayInput = (d = new Date()) => {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 10);
};

export const addDays = (dateStr, n) => {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return dayInput(d);
};

export const duration = (hrs) => {
  const h = Math.floor(hrs);
  const m = Math.round((hrs - h) * 60);
  return m ? `${h}h ${m}m` : `${h}h`;
};

export const BUS_TYPE_LABELS = {
  ac_seater: 'AC Seater',
  seater: 'Seater',
  non_ac_seater: 'Non-AC Seater',
  ac_sleeper: 'AC Sleeper',
  sleeper: 'Sleeper',
  tempo: 'Tempo Traveller',
};

export const busTypeLabel = (t) => BUS_TYPE_LABELS[t] ?? t;

/** Relative "2 min ago" for live feeds. */
export const ago = (iso) => {
  if (!iso) return '';
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return `${Math.round(s / 3600)}h ago`;
};
