import express from 'express';
import { query, one, json } from '../db/index.js';
import { requireAuth } from '../lib/auth.js';
import { canOperate } from '../lib/tracker.js';

/** The demo GPS simulator is on unless SIMULATE_TRIPS=off (production). */
const SIMULATION_ALLOWED = process.env.SIMULATE_TRIPS !== 'off';

export default function driverRoutes(tracker) {
  const router = express.Router();

  const otherBus = (res) => res.status(403).json({ error: 'This trip runs on another bus.' });

  /** The driver's own schedule for the next few days. */
  router.get('/schedule', requireAuth('driver', 'admin'), async (req, res) => {
    const rows = await query(
      `SELECT t.*, b.name AS bus_name, b.registration_no, b.seat_capacity,
              r.origin_city, r.destination_city
       FROM trips t JOIN buses b ON b.id = t.bus_id JOIN routes r ON r.id = t.route_id
       WHERE b.operator_id = $1 AND t.departure_datetime >= $2
         AND t.status IN ('scheduled','ongoing')
       ORDER BY t.departure_datetime LIMIT 40`,
      [req.user.sub, new Date(Date.now() - 12 * 3600 * 1000).toISOString()]
    );
    const trips = [];
    for (const t of rows) {
      const bookings = await query(
        `SELECT COUNT(*) AS n FROM bookings WHERE trip_id = $1 AND booking_status != 'cancelled'`,
        [t.id]
      );
      trips.push({
        id: t.id, departure: t.departure_datetime, arrival: t.arrival_datetime,
        origin: t.origin_city, destination: t.destination_city,
        busName: t.bus_name, registrationNo: t.registration_no,
        status: t.status, capacity: t.seat_capacity,
        bookings: Number(bookings[0]?.n ?? 0),
        sharingLocation: tracker.sim.has(t.id) || tracker.sharing.has(t.id),
      });
    }
    res.json({ trips });
  });

  /** Passenger manifest for boarding. */
  router.get('/trips/:id/manifest', requireAuth('driver', 'admin'), async (req, res) => {
    // Names and phone numbers: only for the crew of this bus.
    if (!(await canOperate(req.user, req.params.id))) return otherBus(res);
    const rows = await query(
      `SELECT b.reference, b.seats_booked, b.party_size, b.passengers, b.checked_in_at, b.booking_status,
              u.name, u.phone, p.area_name, p.city
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       LEFT JOIN pickup_points p ON p.id = b.pickup_point_id
       WHERE b.trip_id = $1 AND b.booking_status != 'cancelled'
       ORDER BY b.id`,
      [Number(req.params.id)]
    );
    res.json({
      manifest: rows.map((r) => ({
        reference: r.reference,
        seats: json(r.seats_booked),
        partySize: r.party_size ?? json(r.passengers).length,
        passengers: json(r.passengers),
        contactName: r.name,
        contactPhone: r.phone,
        pickup: r.area_name ? `${r.area_name}, ${r.city}` : null,
        confirmed: ['confirmed', 'completed'].includes(r.booking_status),
        checkedInAt: r.checked_in_at,
      })),
    });
  });

  /** QR check-in. The scanner sends the decoded payload verbatim. */
  router.post('/check-in', requireAuth('driver', 'admin'), async (req, res) => {
    const code = String(req.body.code || '').replace(/^BRAJ:/, '').trim();
    const tripId = Number(req.body.tripId);
    const b = await one('SELECT * FROM bookings WHERE reference = $1', [code]);
    if (!b) return res.status(404).json({ error: `No booking matches ${code}.` });
    if (tripId && b.trip_id !== tripId) {
      return res.status(400).json({ error: 'That ticket is for a different trip.' });
    }
    if (!b.trip_id || !(await canOperate(req.user, b.trip_id))) {
      return res.status(400).json({ error: 'That ticket is for a different bus.' });
    }
    if (b.booking_status === 'cancelled') {
      return res.status(400).json({ error: 'This booking was cancelled.' });
    }
    if (!['confirmed', 'completed'].includes(b.booking_status)) {
      return res.status(409).json({ error: 'The office has not confirmed this trip yet.' });
    }
    if (b.checked_in_at) {
      return res.status(409).json({
        error: 'Already checked in.',
        checkedInAt: b.checked_in_at,
        seats: json(b.seats_booked),
      });
    }
    await query('UPDATE bookings SET checked_in_at = $1 WHERE id = $2',
      [new Date().toISOString(), b.id]);
    const u = await one('SELECT name FROM users WHERE id = $1', [b.user_id]);
    res.json({
      ok: true,
      reference: b.reference,
      name: u?.name,
      seats: json(b.seats_booked),
      partySize: b.party_size ?? json(b.passengers).length,
    });
  });

  /** Toggle location sharing for a trip the driver is running. */
  router.post('/trips/:id/sharing', requireAuth('driver', 'admin'), async (req, res) => {
    const tripId = Number(req.params.id);
    if (!(await canOperate(req.user, tripId))) return otherBus(res);
    if (req.body.on === false) {
      await tracker.stopSharing(tripId);
      return res.json({ sharing: false });
    }
    // Sharing used to start the demo simulator, so a live bus showed a fake
    // position. Now the driver's phone sends real fixes; the simulator only
    // stands in on a demo install when the device has no GPS to offer.
    const started = await tracker.startSharing(tripId);
    if (!started) return res.status(400).json({ error: 'Could not start sharing for this trip.' });
    const simulated = req.body.gps === false && SIMULATION_ALLOWED
      ? await tracker.startSimulation(tripId)
      : false;
    res.json({ sharing: true, simulated });
  });

  return router;
}
