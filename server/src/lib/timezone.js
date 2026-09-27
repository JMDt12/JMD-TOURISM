/**
 * Every "day" in this business is an Indian day: a 5 AM departure from
 * Mathura is on the date printed on the ticket, not the UTC date before it.
 * Hosts (Render, most clouds) run in UTC, so pin the process to IST before
 * any date is read. Imported first by every entry point. Set TZ to override.
 */
process.env.TZ = process.env.TZ || 'Asia/Kolkata';

export const TIME_ZONE = process.env.TZ;

/** YYYY-MM-DD for a timestamp, in the business time zone. */
export const localDate = (value) => {
  const d = new Date(value);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

/** "28 Sep 2026, 6:00 am" for messages sent to travellers. */
export const formatLocal = (value) =>
  new Date(value).toLocaleString('en-IN', {
    timeZone: TIME_ZONE, day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
