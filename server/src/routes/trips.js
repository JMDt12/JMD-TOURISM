import express from 'express';
import { query, one, json } from '../db/index.js';
import { buildSeatMap, allSeats } from '../lib/seats.js';
import { CANCELLATION_POLICY } from '../lib/trip-options.js';
import { CITIES } from '../lib/geo.js';

const router = express.Router();

/** Local calendar day for a timestamp, so buckets line up with dayBounds. */
const localDay = (d) => {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 10);
};

const dayBounds = (dateStr) => {
  const start = new Date(`${dateStr}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return [start.toISOString(), end.toISOString()];
};

/**
 * Buses are chartered whole, so a departure is either open or taken — there
 * is no partial inventory. A vehicle is only gone once the office confirms
 * a group for it; open enquiries do not lock it, or anyone could block the
 * fleet simply by asking.
 */
const TRIP_SELECT = `
  SELECT t.*, b.name, b.type, b.registration_no, b.amenities, b.photos, b.seat_layout,
         b.driver_name, b.driver_phone, b.driver_photo, b.seat_capacity,
         r.origin_city, r.destination_city, r.distance_km, r.base_duration_hrs, r.stops,
         (SELECT COUNT(*) FROM bookings bk
           WHERE bk.trip_id = t.id
             AND bk.booking_status IN ('confirmed','completed')) AS charter_count
  FROM trips t
  JOIN buses b ON b.id = t.bus_id
  JOIN routes r ON r.id = t.route_id`;

function shapeTrip(t) {
  const layout = json(t.seat_layout, { decks: [] });
  const capacity = allSeats(layout).length || t.seat_capacity;
  return {
    id: t.id,
    departure: t.departure_datetime,
    arrival: t.arrival_datetime,
    durationHrs: Number(t.base_duration_hrs),
    capacity,
    available: Number(t.charter_count) === 0 && t.status === 'scheduled',
    status: t.status,
    bus: {
      id: t.bus_id, name: t.name, type: t.type,
      registrationNo: t.registration_no,
      capacity,
      amenities: json(t.amenities),
      photos: json(t.photos),
      driverName: t.driver_name,
      driverPhoto: t.driver_photo,
    },
    route: {
      id: t.route_id, origin: t.origin_city, destination: t.destination_city,
      distanceKm: t.distance_km, stops: json(t.stops),
    },
  };
}

/**
 * GET /api/trips/search
 * Required: from, to, date (YYYY-MM-DD).
 * Optional: passengers (group size — filters by capacity), busType, maxPrice
 * (on the whole-bus price), departWindow, sort.
 */
router.get('/search', async (req, res) => {
  const { from, to, date } = req.query;
  if (!from || !to || !date) {
    return res.status(400).json({ error: 'from, to and date are all required.' });
  }
  const [start, end] = dayBounds(date);
  const rows = await query(
    `${TRIP_SELECT}
     WHERE r.origin_city = $1 AND r.destination_city = $2
       AND t.departure_datetime >= $3 AND t.departure_datetime < $4
       AND t.status = 'scheduled'
     ORDER BY t.departure_datetime`,
    [from, to, start, end]
  );

  // Only whole, unclaimed vehicles are sellable.
  const open = rows.map(shapeTrip).filter((t) => t.available);
  let trips = open;

  const passengers = Number(req.query.passengers || req.query.seats || 1);
  trips = trips.filter((t) => t.capacity >= passengers);

  if (req.query.busType) {
    const wanted = String(req.query.busType).split(',');
    trips = trips.filter((t) => wanted.includes(t.bus.type));
  }
  if (req.query.departWindow) {
    const windows = {
      morning: [4, 11], afternoon: [11, 16], evening: [16, 21], night: [21, 28],
    };
    const wanted = String(req.query.departWindow).split(',');
    trips = trips.filter((t) => {
      const h = new Date(t.departure).getHours();
      return wanted.some((w) => {
        const [lo, hi] = windows[w] ?? [0, 24];
        const hh = h < 4 ? h + 24 : h;
        return hh >= lo && hh < hi;
      });
    });
  }

  const sorters = {
    departure: (a, b) => new Date(a.departure) - new Date(b.departure),
    capacity_asc: (a, b) => a.capacity - b.capacity,
    capacity_desc: (a, b) => b.capacity - a.capacity,
    duration: (a, b) => a.durationHrs - b.durationHrs,
  };
  trips.sort(sorters[req.query.sort] ?? sorters.departure);

  res.json({
    trips,
    meta: {
      from, to, date,
      total: trips.length,
      passengers,
      // Ranges describe every open bus, so filters do not narrow their own bounds.
      capacityRange: open.length
        ? { min: Math.min(...open.map((t) => t.capacity)), max: Math.max(...open.map((t) => t.capacity)) }
        : null,
      busTypes: [...new Set(open.map((t) => t.bus.type))],
      chartered: rows.length - open.length,
    },
  });
});

/**
 * GET /api/trips/availability
 * How many whole vehicles are free on each day of a window, so the calendar
 * can grey out the days we cannot serve rather than letting someone pick one
 * and discover nothing. Required: from, to. Optional: passengers, start, days.
 */
router.get('/availability', async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) {
    return res.status(400).json({ error: 'from and to are required.' });
  }
  const passengers = Math.max(1, Number(req.query.passengers) || 1);
  const days = Math.min(90, Math.max(1, Number(req.query.days) || 30));

  const start = req.query.start ? new Date(`${req.query.start}T00:00:00`) : new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + days);

  const rows = await query(
    `${TRIP_SELECT}
     WHERE r.origin_city = $1 AND r.destination_city = $2
       AND t.departure_datetime >= $3 AND t.departure_datetime < $4
       AND t.status = 'scheduled'
     ORDER BY t.departure_datetime`,
    [from, to, start.toISOString(), end.toISOString()]
  );

  const byDay = new Map();
  for (const row of rows) {
    const t = shapeTrip(row);
    const key = localDay(t.departure);
    const bucket = byDay.get(key) ?? { date: key, free: 0, total: 0, largest: 0 };
    bucket.total += 1;
    if (t.available && t.capacity >= passengers) {
      bucket.free += 1;
      bucket.largest = Math.max(bucket.largest, t.capacity);
    }
    byDay.set(key, bucket);
  }

  // Emit every day in the window, including the empty ones: the calendar
  // needs to know a day is dead, not merely absent from the response.
  const out = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = localDay(d);
    out.push(byDay.get(key) ?? { date: key, free: 0, total: 0, largest: 0 });
  }

  res.json({
    from, to, passengers,
    days: out,
    // The furthest date we actually have a schedule for.
    lastScheduled: rows.length ? localDay(shapeTrip(rows[rows.length - 1]).departure) : null,
  });
});

/** Full trip detail. The seat plan is shown to convey the vehicle, not to pick from. */
router.get('/:id', async (req, res) => {
  const t = await one(`${TRIP_SELECT} WHERE t.id = $1`, [Number(req.params.id)]);
  if (!t) return res.status(404).json({ error: 'Trip not found.' });

  const layout = json(t.seat_layout, { decks: [] });
  const decks = buildSeatMap(layout).map((deck) => ({
    name: deck.name,
    rows: deck.rows.map((row) => ({
      left: row.left.map((id) => ({ id })),
      right: row.right.map((id) => ({ id })),
    })),
  }));

  const reviews = await query(
    `SELECT rv.rating, rv.comment, rv.created_at, rv.verified_booking, u.name
     FROM reviews rv JOIN users u ON u.id = rv.user_id
     WHERE rv.trip_id IN (SELECT id FROM trips WHERE bus_id = $1)
     ORDER BY rv.created_at DESC LIMIT 10`,
    [t.bus_id]
  );

  const pickupPoints = await query(
    'SELECT * FROM pickup_points WHERE city = $1 ORDER BY area_name',
    [t.origin_city]
  );

  res.json({
    trip: {
      ...shapeTrip(t),
      seatMap: { decks },
      driver: { name: t.driver_name, photo: t.driver_photo },
      pickupPoints,
      routePath: [
        cityPoint(t.origin_city),
        ...json(t.stops).map((s) => ({ name: s.name })),
        cityPoint(t.destination_city),
      ],
      reviews: reviews.map((r) => ({
        name: r.name, rating: r.rating, comment: r.comment,
        createdAt: r.created_at, verified: Boolean(r.verified_booking),
      })),
      cancellationPolicy: CANCELLATION_POLICY,
    },
  });
});

const cityPoint = (name) => ({ name, ...(CITIES[name] ?? {}) });

export default router;
