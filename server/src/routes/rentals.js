/**
 * Cars, bikes and rooms.
 *
 * All three are the same shape — a unit taken for a date range from a city —
 * so they share a table and these endpoints. What differs is the attributes
 * in `specs` and the words the UI puts around them.
 *
 * Availability is "how many are left on these dates", not "is this thing
 * free": a hotel has several of a room type and a hire shop several of the
 * same scooter. Only confirmed bookings consume stock, exactly as with buses,
 * so an open enquiry cannot be used to block the yard.
 */
import express from 'express';
import { query, one, json } from '../db/index.js';

const router = express.Router();

export const KINDS = ['car', 'bike', 'room'];

/** Labels the UI leans on, kept next to the data they describe. */
export const KIND_META = {
  car: {
    plural: 'Cars', unit: 'car', unitPlural: 'cars',
    rangeLabel: 'Days needed', perLabel: 'per day',
  },
  bike: {
    plural: 'Bikes', unit: 'bike', unitPlural: 'bikes',
    rangeLabel: 'Days needed', perLabel: 'per day',
  },
  room: {
    plural: 'Stays', unit: 'room', unitPlural: 'rooms',
    rangeLabel: 'Nights', perLabel: 'per night',
  },
};

const shape = (r, taken = 0) => ({
  id: r.id,
  kind: r.kind,
  name: r.name,
  subtitle: r.subtitle,
  city: r.city,
  area: r.area,
  quantity: r.quantity,
  minDays: r.min_days,
  withDriver: Boolean(r.with_driver),
  specs: json(r.specs, {}),
  features: json(r.features),
  photos: json(r.photos),
  available: Math.max(0, r.quantity - taken),
});

/**
 * How many units of each rental are committed across a date range.
 * Two bookings overlap when each starts before the other ends.
 */
async function takenBetween(start, end) {
  if (!start) return new Map();
  const rows = await query(
    `SELECT rental_id, COALESCE(SUM(units), 0) AS n
     FROM bookings
     WHERE rental_id IS NOT NULL
       AND booking_status IN ('confirmed','completed')
       AND travel_date < $1
       AND (CASE WHEN end_date IS NULL THEN travel_date >= $2 ELSE end_date > $2 END)
     GROUP BY rental_id`,
    [end, start]
  );
  return new Map(rows.map((r) => [r.rental_id, Number(r.n)]));
}

/** The day after a stay ends, so a same-day handover is not a clash. */
const dayAfter = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + 1);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

/**
 * GET /api/rentals?kind=car|bike|room&city=&from=&to=&units=
 * Dates are optional: without them the listing shows the whole fleet with
 * its full stock, which is what a browsing visitor wants to see.
 */
router.get('/', async (req, res) => {
  const { kind, city } = req.query;
  if (kind && !KINDS.includes(kind)) {
    return res.status(400).json({ error: `kind must be one of ${KINDS.join(', ')}` });
  }
  const units = Math.max(1, Number(req.query.units) || 1);
  const from = req.query.from || null;
  const to = req.query.to || (from ? dayAfter(from) : null);

  const rows = kind
    ? await query(`SELECT * FROM rentals WHERE active = true AND kind = $1 ORDER BY city, name`, [kind])
    : await query(`SELECT * FROM rentals WHERE active = true ORDER BY kind, city, name`);

  const taken = await takenBetween(from, to);
  let items = rows.map((r) => shape(r, taken.get(r.id) ?? 0));

  if (city) items = items.filter((i) => i.city === city);
  if (from) items = items.filter((i) => i.available >= units);

  const all = rows.map((r) => shape(r, taken.get(r.id) ?? 0));
  res.json({
    items,
    meta: {
      kind: kind ?? null,
      cities: [...new Set(all.filter((i) => !kind || i.kind === kind).map((i) => i.city))].sort(),
      from, to, units,
      total: items.length,
      unavailable: from ? all.filter((i) => (!kind || i.kind === kind) && i.available < units).length : 0,
    },
  });
});

router.get('/:id', async (req, res) => {
  const r = await one('SELECT * FROM rentals WHERE id = $1', [Number(req.params.id)]);
  if (!r) return res.status(404).json({ error: 'Not found.' });

  const from = req.query.from || null;
  const to = req.query.to || (from ? dayAfter(from) : null);
  const taken = await takenBetween(from, to);

  res.json({
    rental: {
      ...shape(r, taken.get(r.id) ?? 0),
      cancellationPolicy: [
        { window: 'More than 24 hours before pickup', terms: 'Cancel free of charge' },
        { window: 'Under 24 hours before pickup', terms: 'Part of the cost is retained' },
      ],
    },
  });
});

/**
 * GET /api/rentals/:id/availability — free units per day, so the calendar
 * greys out the days we cannot serve.
 */
router.get('/:id/availability', async (req, res) => {
  const id = Number(req.params.id);
  const r = await one('SELECT * FROM rentals WHERE id = $1', [id]);
  if (!r) return res.status(404).json({ error: 'Not found.' });

  const units = Math.max(1, Number(req.query.units) || 1);
  const days = Math.min(120, Math.max(1, Number(req.query.days) || 60));
  const start = req.query.start ? new Date(`${req.query.start}T00:00:00`) : new Date();
  start.setHours(0, 0, 0, 0);

  const rows = await query(
    `SELECT travel_date, end_date, units FROM bookings
     WHERE rental_id = $1 AND booking_status IN ('confirmed','completed')`,
    [id]
  );

  const out = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    const date = d.toISOString().slice(0, 10);
    const busy = rows
      .filter((b) => String(b.travel_date) <= date && date < String(b.end_date ?? dayAfter(String(b.travel_date))))
      .reduce((sum, b) => sum + Number(b.units ?? 1), 0);
    const free = Math.max(0, r.quantity - busy);
    out.push({ date, free: free >= units ? free : 0, total: r.quantity });
  }

  res.json({ days: out, quantity: r.quantity, units });
});

export default router;
