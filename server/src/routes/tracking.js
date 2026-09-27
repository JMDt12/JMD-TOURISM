import express from 'express';
import { query, one, json } from '../db/index.js';
import { requireAuth, optionalAuth } from '../lib/auth.js';
import { CITIES, haversine } from '../lib/geo.js';
import { canOperate } from '../lib/tracker.js';

export default function trackingRoutes(tracker) {
  const router = express.Router();

  /**
   * Public tracking payload. Deliberately open: the whole point of a shareable
   * link is that family can follow the bus without an account. It exposes the
   * vehicle and the driver's operational number, never passenger details.
   */
  router.get('/:tripId', optionalAuth, async (req, res) => {
    const tripId = Number(req.params.tripId);
    const t = await one(
      `SELECT t.*, b.name AS bus_name, b.registration_no, b.driver_name, b.driver_phone, b.driver_photo,
              r.origin_city, r.destination_city, r.stops, r.distance_km, r.base_duration_hrs
       FROM trips t JOIN buses b ON b.id = t.bus_id JOIN routes r ON r.id = t.route_id
       WHERE t.id = $1`,
      [tripId]
    );
    if (!t) return res.status(404).json({ error: 'Trip not found.' });

    const path = (await tracker.pathFor(tripId)) ?? [];
    const position = await tracker.latestFor(tripId);
    const progress = position?.progress ?? 0;

    let totalKm = 0;
    for (let i = 1; i < path.length; i += 1) totalKm += haversine(path[i - 1], path[i]);
    const remainingKm = Math.max(0, totalKm * (1 - progress));
    const hrs = Number(t.base_duration_hrs) * (1 - progress);
    const eta = t.status === 'completed'
      ? null
      : new Date(Date.now() + hrs * 3600 * 1000).toISOString();

    res.json({
      trip: {
        id: t.id,
        status: t.status,
        origin: t.origin_city,
        destination: t.destination_city,
        departure: t.departure_datetime,
        scheduledArrival: t.arrival_datetime,
        busName: t.bus_name,
        registrationNo: t.registration_no,
        driver: { name: t.driver_name, phone: t.driver_phone, photo: t.driver_photo },
        stops: json(t.stops),
      },
      path,
      position,
      eta,
      remainingKm: Math.round(remainingKm),
      simulated: tracker.sim.has(tripId),
      hqPhone: process.env.HQ_PHONE || '+91 89232 35591',
    });
  });

  /**
   * Resolve a booking reference to the trip it rides on, for the public
   * tracker. Deliberately returns nothing but the trip id and its state: the
   * reference is a shareable token, not a key to someone's passenger list.
   */
  router.get('/reference/:reference', async (req, res) => {
    const ref = String(req.params.reference || '').trim().toUpperCase();
    const b = await one(
      `SELECT trip_id, booking_status FROM bookings WHERE reference = $1`,
      [ref]
    );
    if (!b || !b.trip_id || !['confirmed', 'completed'].includes(b.booking_status)) {
      return res.status(404).json({ error: 'No confirmed trip matches that reference.' });
    }
    res.json({ tripId: b.trip_id, status: b.booking_status });
  });

  /** Driver push (REST fallback for the socket channel). */
  router.post('/:tripId/location', requireAuth('driver', 'admin'), async (req, res) => {
    const { lat, lng, speed = 0 } = req.body;
    if (typeof lat !== 'number' || typeof lng !== 'number'
        || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return res.status(400).json({ error: 'lat and lng are required numbers.' });
    }
    const tripId = Number(req.params.tripId);
    if (!(await canOperate(req.user, tripId))) {
      return res.status(403).json({ error: 'This trip runs on another bus.' });
    }
    const payload = await tracker.pushReal(tripId, {
      lat, lng, speed: Math.max(0, Math.min(200, Number(speed) || 0)),
    });
    res.json({ position: payload });
  });

  /** Every trip currently moving: the HQ control map reads this on load. */
  router.get('/', requireAuth('admin'), async (_req, res) => {
    const rows = await query(
      `SELECT t.id, t.status, t.departure_datetime, t.arrival_datetime,
              b.name AS bus_name, b.registration_no, b.driver_name, b.driver_phone,
              r.origin_city, r.destination_city
       FROM trips t JOIN buses b ON b.id = t.bus_id JOIN routes r ON r.id = t.route_id
       WHERE t.status = 'ongoing' ORDER BY t.departure_datetime`
    );
    const active = [];
    for (const t of rows) {
      const position = await tracker.latestFor(t.id);
      const seats = await one(
        `SELECT COUNT(*) AS n FROM bookings WHERE trip_id = $1 AND booking_status != 'cancelled'`,
        [t.id]
      );
      active.push({
        id: t.id, status: t.status,
        origin: t.origin_city, destination: t.destination_city,
        busName: t.bus_name, registrationNo: t.registration_no,
        driverName: t.driver_name, driverPhone: t.driver_phone,
        departure: t.departure_datetime,
        bookings: Number(seats?.n ?? 0),
        position,
      });
    }
    res.json({ active, cities: CITIES });
  });

  /** Start or stop the simulated feed for a trip (HQ demo control). */
  router.post('/:tripId/simulate', requireAuth('admin'), async (req, res) => {
    const tripId = Number(req.params.tripId);
    if (req.body.stop) {
      tracker.stopSimulation(tripId);
      return res.json({ simulating: false });
    }
    const ok = await tracker.startSimulation(tripId);
    if (!ok) return res.status(400).json({ error: 'This route has no mappable path.' });
    res.json({ simulating: true });
  });

  return router;
}
