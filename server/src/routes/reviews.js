import express from 'express';
import { query, one, json, jsonParam } from '../db/index.js';
import { requireAuth } from '../lib/auth.js';

const router = express.Router();

/** Reviews are only accepted against a completed booking the reviewer owns. */
router.post('/', requireAuth(), async (req, res) => {
  const { reference, rating, comment = '', guideId = null, photos = [] } = req.body;
  const r = Number(rating);
  if (!(r >= 1 && r <= 5)) return res.status(400).json({ error: 'Rating must be 1 to 5.' });

  const booking = await one('SELECT * FROM bookings WHERE reference = $1', [reference]);
  if (!booking) return res.status(404).json({ error: 'Booking not found.' });
  if (booking.user_id !== req.user.sub) {
    return res.status(403).json({ error: 'You can only review your own trips.' });
  }
  if (!['confirmed', 'completed'].includes(booking.booking_status)) {
    return res.status(400).json({ error: 'Only confirmed trips can be reviewed.' });
  }
  const already = await one(
    'SELECT id FROM reviews WHERE booking_id = $1 AND user_id = $2',
    [booking.id, req.user.sub]
  );
  if (already) return res.status(409).json({ error: 'You have already reviewed this trip.' });

  await query(
    `INSERT INTO reviews (user_id, booking_id, trip_id, guide_id, rating, comment, photos, verified_booking)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
    [req.user.sub, booking.id, booking.trip_id, guideId ? Number(guideId) : null,
     r, String(comment).slice(0, 2000), jsonParam(photos.slice(0, 6))]
  );

  if (guideId) {
    const agg = await one(
      'SELECT COUNT(*) AS n, AVG(rating) AS avg FROM reviews WHERE guide_id = $1',
      [Number(guideId)]
    );
    await query(
      'UPDATE guides SET rating_avg = $1, rating_count = $2 WHERE id = $3',
      [Math.round(Number(agg.avg) * 10) / 10, Number(agg.n), Number(guideId)]
    );
  }
  res.status(201).json({ saved: true });
});

/** Reviews awaiting the customer: paid trips they have not rated yet. */
router.get('/pending', requireAuth(), async (req, res) => {
  const rows = await query(
    `SELECT b.reference, b.travel_date, b.addons, r.origin_city, r.destination_city
     FROM bookings b
     LEFT JOIN trips t ON t.id = b.trip_id
     LEFT JOIN routes r ON r.id = t.route_id
     WHERE b.user_id = $1 AND b.booking_status IN ('confirmed','completed')
       AND b.id NOT IN (SELECT booking_id FROM reviews WHERE booking_id IS NOT NULL)`,
    [req.user.sub]
  );
  res.json({
    pending: rows.map((b) => ({
      reference: b.reference,
      travelDate: b.travel_date,
      label: b.origin_city ? `${b.origin_city} to ${b.destination_city}` : 'Package booking',
      guides: json(b.addons).filter((a) => a.code === 'guide'),
    })),
  });
});

router.get('/latest', async (_req, res) => {
  const rows = await query(
    `SELECT r.rating, r.comment, r.created_at, u.name, ro.origin_city, ro.destination_city
     FROM reviews r
     JOIN users u ON u.id = r.user_id
     LEFT JOIN trips t ON t.id = r.trip_id
     LEFT JOIN routes ro ON ro.id = t.route_id
     WHERE r.verified_booking = true AND r.comment != ''
     ORDER BY r.created_at DESC LIMIT 8`
  );
  res.json({
    reviews: rows.map((r) => ({
      name: r.name, rating: r.rating, comment: r.comment, createdAt: r.created_at,
      route: r.origin_city ? `${r.origin_city} to ${r.destination_city}` : null,
    })),
  });
});

export default router;
