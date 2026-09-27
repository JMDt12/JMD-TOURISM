/**
 * Enquiries and trips.
 *
 * We do not publish rates, so a customer sends a request rather than paying:
 * the Mathura office reads it, quotes by phone or WhatsApp, and confirms.
 * A booking therefore moves new -> quoted -> confirmed, and only a confirmed
 * trip gets a QR ticket and takes the vehicle off the board.
 */
import express from 'express';
import QRCode from 'qrcode';
import { query, one, json, jsonParam } from '../db/index.js';
import { requireAuth } from '../lib/auth.js';
import { describeAddons, ADDON_CATALOG, CANCELLATION_POLICY } from '../lib/trip-options.js';
import { allSeats } from '../lib/seats.js';
import { notify } from '../lib/notify.js';
import { localDate, formatLocal } from '../lib/timezone.js';

const router = express.Router();

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PASSENGERS = 120;

const PUBLIC_URL = (process.env.PUBLIC_URL || 'http://localhost:5173').trim().replace(/\/$/, '');

/** The day after a date, so a same-day handover is not treated as a clash. */
export const dayAfter = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + 1);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};
const reference = () =>
  `JMD-${Date.now().toString(36).toUpperCase().slice(-5)}${Math.floor(10 + Math.random() * 89)}`;

/** Statuses where the vehicle is actually committed to this group. */
export const COMMITTED = ['confirmed', 'completed'];

/** Resolve requested add-ons, naming the guide so the office can see it. */
async function resolveAddons(rawAddons = []) {
  const out = [];
  for (const a of rawAddons) {
    if (a.code === 'guide') {
      const g = await one(
        `SELECT g.*, u.name, u.phone FROM guides g JOIN users u ON u.id = g.user_id WHERE g.id = $1`,
        [Number(a.guideId)]
      );
      if (!g) continue;
      const chosen = json(g.itineraries)[Number(a.itineraryIndex) || 0];
      out.push({
        code: 'guide',
        guideId: g.id,
        guideName: g.name,
        guidePhone: g.phone,
        label: chosen ? `Guide: ${g.name} — ${chosen.title}` : `Guide: ${g.name}`,
        hours: Number(a.hours) || chosen?.hours || 4,
        quantity: 1,
      });
    } else if (ADDON_CATALOG[a.code]) {
      out.push({ code: a.code, quantity: Number(a.quantity) || 1 });
    }
  }
  return describeAddons(out);
}

const loadTrip = (id) => one(
  `SELECT t.*, b.seat_layout, b.seat_capacity, b.name AS bus_name,
          b.driver_name, b.driver_phone, r.origin_city, r.destination_city
   FROM trips t JOIN buses b ON b.id = t.bus_id JOIN routes r ON r.id = t.route_id
   WHERE t.id = $1`,
  [id]
);

/**
 * A vehicle is only off the board once the office confirms a group. Open
 * enquiries do not lock it, or anyone could block the fleet by asking.
 */
async function isCommitted(tripId) {
  const row = await one(
    `SELECT COUNT(*) AS n FROM bookings
     WHERE trip_id = $1 AND booking_status IN ('confirmed','completed')`,
    [tripId]
  );
  return Number(row?.n ?? 0) > 0;
}

/** Send an enquiry. The office replies with a quote. */
router.post('/', requireAuth(), async (req, res) => {
  const {
    tripId, packageId, rentalId, travelDate, endDate, units = 1,
    passengers = [], partySize = 1, pickupPointId = null, addons = [], notes = '',
    contactPhone = null, contactEmail = null,
  } = req.body;

  if (!tripId && !packageId && !rentalId) {
    return res.status(400).json({ error: 'Pick a departure, a tour or a vehicle to enquire about.' });
  }
  // A malformed body used to reach .map() and come back as a 500.
  if (!Array.isArray(passengers) || !passengers.length
      || passengers.some((p) => !p || typeof p !== 'object' || !String(p.name ?? '').trim())) {
    return res.status(400).json({ error: 'Add the lead passenger.' });
  }
  if (passengers.length > MAX_PASSENGERS) {
    return res.status(400).json({ error: `Send at most ${MAX_PASSENGERS} names; the office takes the rest by phone.` });
  }
  if (!Array.isArray(addons)) {
    return res.status(400).json({ error: 'Add-ons must be a list.' });
  }
  if ((travelDate && !ISO_DATE.test(travelDate)) || (endDate && !ISO_DATE.test(endDate))) {
    return res.status(400).json({ error: 'Dates must be in YYYY-MM-DD form.' });
  }
  if (travelDate && endDate && endDate < travelDate) {
    return res.status(400).json({ error: 'The end date is before the start date.' });
  }

  let trip = null;
  let seatIds = [];

  if (tripId) {
    trip = await loadTrip(Number(tripId));
    if (!trip) return res.status(404).json({ error: 'Trip not found.' });
    if (await isCommitted(trip.id)) {
      return res.status(409).json({
        error: 'This bus has just been confirmed for another group. Please pick another departure.',
      });
    }
    seatIds = allSeats(json(trip.seat_layout, { decks: [] }));
    const capacity = seatIds.length || trip.seat_capacity;
    if (Number(partySize) > capacity) {
      return res.status(400).json({
        error: `This bus seats ${capacity}. Choose a larger vehicle for ${partySize} travellers.`,
      });
    }
  } else if (rentalId) {
    const rental = await one('SELECT * FROM rentals WHERE id = $1', [Number(rentalId)]);
    if (!rental) return res.status(404).json({ error: 'Not found.' });
    if (!travelDate) return res.status(400).json({ error: 'Tell us the start date.' });
    if (Number(units) > rental.quantity) {
      return res.status(400).json({
        error: `We have ${rental.quantity} of these. Ask the office about a larger booking.`,
      });
    }
  } else {
    const pkg = await one('SELECT id FROM packages WHERE id = $1', [Number(packageId)]);
    if (!pkg) return res.status(404).json({ error: 'Package not found.' });
  }

  const resolved = await resolveAddons(addons);
  // The Indian calendar day of departure: slicing the UTC timestamp would put
  // anything leaving before 5:30 AM on the day before.
  const startDate = travelDate ?? (trip ? localDate(trip.departure_datetime) : null);
  const ref = reference();
  const rows = await query(
    `INSERT INTO bookings
      (reference, user_id, trip_id, package_id, rental_id, travel_date, end_date, units,
       seats_booked, party_size, passengers, pickup_point_id, addons, booking_status, qr_code,
       notes, contact_phone, contact_email)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'new',NULL,$14,$15,$16)
     RETURNING *`,
    [
      ref, req.user.sub, tripId ? Number(tripId) : null, packageId ? Number(packageId) : null,
      rentalId ? Number(rentalId) : null,
      startDate,
      // A rental with no end date would overlap nothing, so it would be
      // invisible to availability. Close the range at the source instead.
      endDate ?? (rentalId ? dayAfter(startDate) : null),
      Math.max(1, Number(units) || 1),
      jsonParam(seatIds), Math.max(1, Number(partySize) || passengers.length),
      jsonParam(passengers.map((p) => ({ ...p, notes: undefined }))),
      pickupPointId ? Number(pickupPointId) : null, jsonParam(resolved),
      String(notes ?? '').slice(0, 2000) || null,
      contactPhone ? String(contactPhone).slice(0, 20) : null,
      contactEmail ? String(contactEmail).slice(0, 200) : null,
    ]
  );
  const booking = rows[0];

  // The guide is asked only once the office confirms, so they are not
  // chasing dates that may never happen.
  const user = await one('SELECT name, phone FROM users WHERE id = $1', [req.user.sub]);
  await notify({
    bookingId: booking.id, recipient: user.phone, template: 'enquiry_received',
    data: {
      name: user.name,
      reference: ref,
      summary: trip
        ? `${trip.origin_city} to ${trip.destination_city}, ${formatLocal(trip.departure_datetime)}`
        : rentalId
          ? `vehicle or room from ${travelDate}${endDate ? ` to ${endDate}` : ''}`
          : `tour enquiry starting ${travelDate}`,
      party: Math.max(1, Number(partySize) || passengers.length),
      notes,
    },
  });

  res.status(201).json({ booking: await shapeBooking(booking) });
});

/** My trips and enquiries. */
router.get('/', requireAuth(), async (req, res) => {
  const rows = await query(
    'SELECT * FROM bookings WHERE user_id = $1 ORDER BY id DESC',
    [req.user.sub]
  );
  const bookings = await Promise.all(rows.map((b) => shapeBooking(b)));
  const now = Date.now();
  res.json({
    upcoming: bookings.filter((b) => isUpcoming(b, now)),
    past: bookings.filter((b) => !isUpcoming(b, now)),
  });
});

router.get('/:reference', requireAuth(), async (req, res) => {
  const b = await one('SELECT * FROM bookings WHERE reference = $1', [req.params.reference]);
  if (!b) return res.status(404).json({ error: 'Booking not found.' });
  if (b.user_id !== req.user.sub && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'That booking belongs to another account.' });
  }
  res.json({ booking: await shapeBooking(b, { withQr: true }) });
});

router.post('/:reference/cancel', requireAuth(), async (req, res) => {
  const b = await one('SELECT * FROM bookings WHERE reference = $1', [req.params.reference]);
  if (!b) return res.status(404).json({ error: 'Booking not found.' });
  if (b.user_id !== req.user.sub && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'That booking belongs to another account.' });
  }
  if (b.booking_status === 'cancelled') {
    return res.status(400).json({ error: 'This is already cancelled.' });
  }
  if (b.booking_status === 'completed') {
    return res.status(400).json({ error: 'This trip has already happened.' });
  }

  await query(`UPDATE bookings SET booking_status = 'cancelled' WHERE id = $1`, [b.id]);
  if (b.trip_id) await releaseTrip(b.trip_id);
  await query(`UPDATE guide_bookings SET status = 'rejected' WHERE booking_id = $1`, [b.id]);

  const user = await one('SELECT name, phone FROM users WHERE id = $1', [b.user_id]);
  await notify({
    bookingId: b.id, recipient: user.phone, template: 'booking_cancelled',
    data: { reference: b.reference },
  });

  res.json({ cancelled: true, policy: CANCELLATION_POLICY });
});

/** Put a vehicle back on sale when nothing is committed to it any more. */
export async function releaseTrip(tripId) {
  if (await isCommitted(tripId)) return;
  const bus = await one(
    'SELECT b.seat_capacity FROM trips t JOIN buses b ON b.id = t.bus_id WHERE t.id = $1',
    [tripId]
  );
  await query('UPDATE trips SET seats_available = $1 WHERE id = $2',
    [bus?.seat_capacity ?? 0, tripId]);
}

/** Trips still ahead of the traveller, and not cancelled. */
function isUpcoming(b, now) {
  if (['cancelled', 'completed'].includes(b.bookingStatus)) return false;
  const when = b.departure ?? b.travelDate;
  return when ? new Date(when).getTime() >= now : true;
}

/** Shared shaping so every endpoint returns bookings in one format. */
export async function shapeBooking(b, { withQr = false } = {}) {
  const trip = b.trip_id
    ? await one(
        `SELECT t.*, bu.name AS bus_name, bu.type AS bus_type, bu.registration_no,
                bu.driver_name, bu.driver_phone,
                r.origin_city, r.destination_city
         FROM trips t JOIN buses bu ON bu.id = t.bus_id JOIN routes r ON r.id = t.route_id
         WHERE t.id = $1`, [b.trip_id])
    : null;
  const pkg = b.package_id
    ? await one('SELECT id, slug, title, duration_days, base_camp FROM packages WHERE id = $1', [b.package_id])
    : null;
  const pickup = b.pickup_point_id
    ? await one('SELECT * FROM pickup_points WHERE id = $1', [b.pickup_point_id])
    : null;
  const rental = b.rental_id
    ? await one('SELECT * FROM rentals WHERE id = $1', [b.rental_id])
    : null;

  const status = b.booking_status;
  const confirmed = COMMITTED.includes(status);

  return {
    id: b.id,
    reference: b.reference,
    travelDate: b.travel_date,
    endDate: b.end_date ?? null,
    units: b.units ?? 1,
    departure: trip?.departure_datetime ?? null,
    arrival: trip?.arrival_datetime ?? null,
    partySize: b.party_size ?? json(b.passengers).length,
    notes: b.notes ?? null,
    contactPhone: b.contact_phone ?? null,
    contactEmail: b.contact_email ?? null,
    wholeBus: Boolean(b.trip_id),
    capacity: json(b.seats_booked).length,
    passengers: json(b.passengers),
    addons: json(b.addons),
    bookingStatus: status,
    confirmed,
    checkedInAt: b.checked_in_at ?? null,
    createdAt: b.created_at,
    trackUrl: trip && confirmed ? `${PUBLIC_URL}/track/${trip.id}` : null,
    pickup,
    trip: trip && {
      id: trip.id, origin: trip.origin_city, destination: trip.destination_city,
      busName: trip.bus_name, busType: trip.bus_type, registrationNo: trip.registration_no,
      driverName: trip.driver_name, driverPhone: trip.driver_phone, status: trip.status,
    },
    package: pkg && {
      id: pkg.id, slug: pkg.slug, title: pkg.title,
      durationDays: pkg.duration_days, baseCamp: pkg.base_camp,
    },
    rental: rental && {
      id: rental.id, kind: rental.kind, name: rental.name, subtitle: rental.subtitle,
      city: rental.city, area: rental.area, withDriver: Boolean(rental.with_driver),
    },
    // A ticket only exists once the office has confirmed the trip.
    ...(withQr && confirmed
      ? { qrDataUrl: await QRCode.toDataURL(`BRAJ:${b.reference}`, { margin: 1, width: 320 }) }
      : {}),
  };
}

export default router;
