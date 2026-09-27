/**
 * HQ Control Center.
 *
 * The office does not price trips in this system — rates move with season,
 * group and vehicle, so quoting happens by phone or WhatsApp. What HQ needs
 * here is the queue: who has asked, who has been quoted, who is confirmed,
 * and which vehicles that commits.
 */
import express from 'express';
import { query, one, json } from '../db/index.js';
import { requireAuth } from '../lib/auth.js';
import { notify } from '../lib/notify.js';
import { POINTS_PER_TRIP } from '../lib/trip-options.js';
import { releaseTrip, shapeBooking } from './bookings.js';

const router = express.Router();
router.use(requireAuth('admin'));

const PUBLIC_URL = process.env.PUBLIC_URL || 'http://localhost:5173';

/** Headline numbers for the HQ dashboard. */
router.get('/overview', async (_req, res) => {
  const count = async (sql, params = []) => Number((await one(sql, params))?.n ?? 0);

  res.json({
    newEnquiries: await count(`SELECT COUNT(*) AS n FROM bookings WHERE booking_status = 'new'`),
    awaitingReply: await count(
      `SELECT COUNT(*) AS n FROM bookings WHERE booking_status IN ('new','quoted')`
    ),
    confirmedTrips: await count(
      `SELECT COUNT(*) AS n FROM bookings WHERE booking_status IN ('confirmed','completed')`
    ),
    activeTrips: await count(`SELECT COUNT(*) AS n FROM trips WHERE status = 'ongoing'`),
    fleetSize: await count('SELECT COUNT(*) AS n FROM buses'),
    guidesAwaitingVerification: await count(
      `SELECT COUNT(*) AS n FROM guides WHERE verification_status = 'pending'`
    ),
    customers: await count(`SELECT COUNT(*) AS n FROM users WHERE role = 'customer'`),
    repeatCustomers: (await query(
      `SELECT user_id FROM bookings WHERE booking_status != 'cancelled'
       GROUP BY user_id HAVING COUNT(*) > 1`
    )).length,
  });
});

/** Demand and conversion by route, counted in trips rather than rupees. */
router.get('/analytics/routes', async (_req, res) => {
  const demand = await query(
    `SELECT r.origin_city, r.destination_city,
            COUNT(b.id) AS enquiries,
            SUM(CASE WHEN b.booking_status IN ('confirmed','completed') THEN 1 ELSE 0 END) AS confirmed
     FROM routes r
     LEFT JOIN trips t ON t.route_id = r.id
     LEFT JOIN bookings b ON b.trip_id = t.id AND b.booking_status != 'cancelled'
     GROUP BY r.id, r.origin_city, r.destination_city
     HAVING COUNT(b.id) > 0
     ORDER BY enquiries DESC
     LIMIT 15`
  );
  // Vehicles are chartered whole, so the rate that matters is how many
  // departures sold, not how many seats went within a departure.
  const charter = await query(
    `SELECT r.origin_city, r.destination_city,
            COUNT(t.id) AS departures,
            COUNT(bk.id) AS chartered
     FROM trips t
     JOIN routes r ON r.id = t.route_id
     LEFT JOIN bookings bk ON bk.trip_id = t.id
       AND bk.booking_status IN ('confirmed','completed')
     WHERE t.departure_datetime < $1
     GROUP BY r.id, r.origin_city, r.destination_city
     ORDER BY chartered DESC, departures DESC LIMIT 15`,
    [new Date(Date.now() + 7 * 86400000).toISOString()]
  );

  res.json({
    demandByRoute: demand.map((r) => ({
      route: `${r.origin_city} to ${r.destination_city}`,
      enquiries: Number(r.enquiries),
      confirmed: Number(r.confirmed ?? 0),
    })),
    occupancy: charter.map((r) => ({
      route: `${r.origin_city} to ${r.destination_city}`,
      sold: Number(r.chartered),
      capacity: Number(r.departures),
      pct: Number(r.departures) ? Math.round((Number(r.chartered) / Number(r.departures)) * 100) : 0,
    })),
  });
});

// ---- The enquiry queue ----------------------------------------------------

const STATUSES = ['new', 'quoted', 'confirmed', 'cancelled', 'completed'];

router.get('/enquiries', async (req, res) => {
  const status = req.query.status;
  const where = STATUSES.includes(status) ? 'WHERE b.booking_status = $1' : '';
  const rows = await query(
    `SELECT b.*, u.name, u.phone, u.email,
            r.origin_city, r.destination_city, t.departure_datetime,
            bu.name AS bus_name, bu.registration_no, bu.seat_capacity,
            p.title AS package_title, pp.area_name, pp.city AS pickup_city,
            rn.kind AS rental_kind, rn.name AS rental_name, rn.subtitle AS rental_subtitle,
            rn.city AS rental_city
     FROM bookings b
     JOIN users u ON u.id = b.user_id
     LEFT JOIN trips t ON t.id = b.trip_id
     LEFT JOIN buses bu ON bu.id = t.bus_id
     LEFT JOIN routes r ON r.id = t.route_id
     LEFT JOIN packages p ON p.id = b.package_id
     LEFT JOIN pickup_points pp ON pp.id = b.pickup_point_id
     LEFT JOIN rentals rn ON rn.id = b.rental_id
     ${where}
     ORDER BY
       CASE b.booking_status WHEN 'new' THEN 0 WHEN 'quoted' THEN 1 ELSE 2 END,
       b.id DESC
     LIMIT 100`,
    STATUSES.includes(status) ? [status] : []
  );

  res.json({
    enquiries: rows.map((b) => ({
      reference: b.reference,
      status: b.booking_status,
      customer: b.name,
      phone: b.phone,
      email: b.email,
      partySize: b.party_size,
      travelDate: b.travel_date,
      departure: b.departure_datetime,
      what: b.origin_city
        ? `${b.origin_city} to ${b.destination_city}`
        : b.rental_name
          ? `${b.rental_name}${b.rental_subtitle ? ` — ${b.rental_subtitle}` : ''}`
          : b.package_title ?? 'Tour',
      kind: b.rental_kind ?? (b.origin_city ? 'bus' : 'tour'),
      endDate: b.end_date,
      units: b.units,
      vehicle: b.bus_name
        ? `${b.bus_name} · ${b.registration_no} · ${b.seat_capacity} seats`
        : b.rental_city ? `${b.rental_city}` : null,
      pickup: b.area_name ? `${b.area_name}, ${b.pickup_city}` : null,
      addons: json(b.addons),
      notes: b.notes ?? null,
      contactPhone: b.contact_phone ?? null,
      contactEmail: b.contact_email ?? null,
      createdAt: b.created_at,
    })),
  });
});

/**
 * Move an enquiry along. Confirming is the moment the vehicle is committed,
 * the guide is actually asked, and the traveller gets a QR ticket.
 */
router.post('/enquiries/:reference/:action', async (req, res) => {
  const { reference, action } = req.params;
  const b = await one('SELECT * FROM bookings WHERE reference = $1', [reference]);
  if (!b) return res.status(404).json({ error: 'Enquiry not found.' });

  const user = await one('SELECT name, phone FROM users WHERE id = $1', [b.user_id]);

  if (action === 'quote') {
    await query(`UPDATE bookings SET booking_status = 'quoted' WHERE id = $1`, [b.id]);
    await notify({
      bookingId: b.id, recipient: user.phone, template: 'enquiry_quoted',
      data: { reference: b.reference },
    });
    return res.json({ status: 'quoted' });
  }

  if (action === 'confirm') {
    // A rental is stock, not a single vehicle: confirming must not take more
    // units than exist on those dates.
    if (b.rental_id) {
      const rental = await one('SELECT quantity, name FROM rentals WHERE id = $1', [b.rental_id]);
      const taken = await one(
        `SELECT COALESCE(SUM(units), 0) AS n FROM bookings
         WHERE rental_id = $1 AND id != $2
           AND booking_status IN ('confirmed','completed')
           AND travel_date < $3
           AND COALESCE(end_date, travel_date) > $4`,
        [b.rental_id, b.id, b.end_date ?? b.travel_date, b.travel_date]
      );
      const free = (rental?.quantity ?? 0) - Number(taken?.n ?? 0);
      if (Number(b.units ?? 1) > free) {
        return res.status(409).json({
          error: `Only ${Math.max(0, free)} of ${rental?.name} free on those dates, and this asks for ${b.units}.`,
        });
      }
    }
    if (b.trip_id) {
      const clash = await one(
        `SELECT reference FROM bookings
         WHERE trip_id = $1 AND id != $2 AND booking_status IN ('confirmed','completed')`,
        [b.trip_id, b.id]
      );
      if (clash) {
        return res.status(409).json({
          error: `That vehicle is already confirmed for ${clash.reference}.`,
        });
      }
      await query('UPDATE trips SET seats_available = 0 WHERE id = $1', [b.trip_id]);
    }
    await query(
      `UPDATE bookings SET booking_status = 'confirmed', qr_code = $1 WHERE id = $2`,
      [b.reference, b.id]
    );

    // Only now is the guide asked: they are not chasing dates that may never happen.
    for (const a of json(b.addons).filter((x) => x.code === 'guide')) {
      const already = await one(
        'SELECT id FROM guide_bookings WHERE booking_id = $1 AND guide_id = $2',
        [b.id, a.guideId]
      );
      if (!already) {
        await query(
          `INSERT INTO guide_bookings (guide_id, booking_id, date, duration_hrs, status)
           VALUES ($1, $2, $3, $4, 'pending')`,
          [a.guideId, b.id, b.travel_date, a.hours ?? 4]
        );
      }
    }

    await query('UPDATE users SET loyalty_points = loyalty_points + $1 WHERE id = $2',
      [POINTS_PER_TRIP, b.user_id]);

    const fresh = await one('SELECT * FROM bookings WHERE id = $1', [b.id]);
    const shaped = await shapeBooking(fresh);
    await notify({
      bookingId: b.id, recipient: user.phone, template: 'booking_confirmed',
      data: {
        reference: b.reference,
        summary: shaped.trip
          ? `${shaped.trip.origin} to ${shaped.trip.destination}, ${new Date(shaped.departure).toLocaleString('en-IN')}`
          : `${shaped.package?.title} starting ${shaped.travelDate}`,
        pickup: shaped.pickup ? `${shaped.pickup.area_name}, ${shaped.pickup.city}` : 'To be confirmed',
        trackUrl: shaped.trackUrl ?? `${PUBLIC_URL}/my-trips`,
      },
    });
    return res.json({ status: 'confirmed' });
  }

  if (action === 'cancel') {
    await query(`UPDATE bookings SET booking_status = 'cancelled' WHERE id = $1`, [b.id]);
    if (b.trip_id) await releaseTrip(b.trip_id);
    await query(`UPDATE guide_bookings SET status = 'rejected' WHERE booking_id = $1`, [b.id]);
    await notify({
      bookingId: b.id, recipient: user.phone, template: 'booking_cancelled',
      data: { reference: b.reference },
    });
    return res.json({ status: 'cancelled' });
  }

  res.status(400).json({ error: 'Unknown action.' });
});

/** Fleet management. */
router.get('/buses', async (_req, res) => {
  const rows = await query(
    `SELECT b.*, u.name AS operator_name, u.phone AS operator_phone,
            (SELECT COUNT(*) FROM trips t WHERE t.bus_id = b.id AND t.status = 'scheduled') AS upcoming_trips
     FROM buses b LEFT JOIN users u ON u.id = b.operator_id ORDER BY b.id`
  );
  res.json({
    buses: rows.map((b) => ({
      id: b.id, name: b.name, type: b.type, registrationNo: b.registration_no,
      capacity: b.seat_capacity, amenities: json(b.amenities), photos: json(b.photos),
      driverName: b.driver_name, driverPhone: b.driver_phone,
      operatorName: b.operator_name, upcomingTrips: Number(b.upcoming_trips),
    })),
  });
});

/** Guide verification queue. */
router.get('/guides', async (_req, res) => {
  const rows = await query(
    `SELECT g.*, u.name, u.phone FROM guides g JOIN users u ON u.id = g.user_id ORDER BY
       CASE g.verification_status WHEN 'pending' THEN 0 WHEN 'verified' THEN 1 ELSE 2 END, g.id`
  );
  res.json({
    guides: rows.map((g) => ({
      id: g.id, name: g.name, phone: g.phone, baseCity: g.base_city,
      specialty: g.specialty, languages: json(g.languages),
      rating: Number(g.rating_avg), ratingCount: g.rating_count,
      status: g.verification_status, idProofUrl: g.id_proof_url,
      yearsExperience: g.years_experience,
    })),
  });
});

router.post('/guides/:id/verify', async (req, res) => {
  const status = req.body.approve ? 'verified' : 'rejected';
  await query('UPDATE guides SET verification_status = $1 WHERE id = $2',
    [status, Number(req.params.id)]);
  res.json({ status });
});

/** WhatsApp broadcast to a segment. */
router.post('/broadcast', async (req, res) => {
  const { segment = 'upcoming', message } = req.body;
  if (!message || message.length < 5) {
    return res.status(400).json({ error: 'Write a message first.' });
  }
  const queries = {
    upcoming: `SELECT DISTINCT u.phone, u.name FROM users u JOIN bookings b ON b.user_id = u.id
               WHERE b.booking_status = 'confirmed'`,
    enquirers: `SELECT DISTINCT u.phone, u.name FROM users u JOIN bookings b ON b.user_id = u.id
                WHERE b.booking_status IN ('new','quoted')`,
    all_customers: `SELECT phone, name FROM users WHERE role = 'customer'`,
    guides: `SELECT phone, name FROM users WHERE role = 'guide'`,
    drivers: `SELECT phone, name FROM users WHERE role = 'driver'`,
  };
  const rows = await query(queries[segment] ?? queries.upcoming);
  for (const r of rows) {
    await notify({ recipient: r.phone, template: 'broadcast', data: { body: message } });
  }
  res.json({ queued: rows.length, segment });
});

/** The outbox: what was sent, or would have been sent. */
router.get('/notifications', async (_req, res) => {
  const rows = await query('SELECT * FROM notifications ORDER BY id DESC LIMIT 60');
  res.json({ notifications: rows });
});

export default router;
