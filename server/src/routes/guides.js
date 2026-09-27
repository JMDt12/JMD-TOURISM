import express from 'express';
import { query, one, json, jsonParam } from '../db/index.js';
import { requireAuth } from '../lib/auth.js';

const router = express.Router();

const shapeGuide = (g) => ({
  id: g.id,
  name: g.name,
  photo: g.photo,
  bio: g.bio,
  languages: json(g.languages),
  specialty: g.specialty,
  baseCity: g.base_city,
  yearsExperience: g.years_experience,
  rating: Number(g.rating_avg),
  ratingCount: g.rating_count,
  verified: g.verification_status === 'verified',
  itineraries: json(g.itineraries),
});

const GUIDE_SELECT = `
  SELECT g.*, u.name, u.phone FROM guides g JOIN users u ON u.id = g.user_id`;

/** Public marketplace listing: verified guides only. */
router.get('/', async (req, res) => {
  const { city, language, sort } = req.query;
  let rows = await query(`${GUIDE_SELECT} WHERE g.verification_status = 'verified'`);
  let guides = rows.map(shapeGuide);

  if (city) guides = guides.filter((g) => g.baseCity === city);
  if (language) guides = guides.filter((g) => g.languages.includes(language));

  const sorters = {
    rating: (a, b) => b.rating - a.rating,
    experience: (a, b) => b.yearsExperience - a.yearsExperience,
  };
  guides.sort(sorters[sort] ?? sorters.rating);

  const all = rows.map(shapeGuide);
  res.json({
    guides,
    meta: {
      cities: [...new Set(all.map((g) => g.baseCity))].sort(),
      languages: [...new Set(all.flatMap((g) => g.languages))].sort(),
    },
  });
});

router.get('/:id', async (req, res) => {
  const g = await one(`${GUIDE_SELECT} WHERE g.id = $1`, [Number(req.params.id)]);
  if (!g) return res.status(404).json({ error: 'Guide not found.' });
  const reviews = await query(
    `SELECT r.rating, r.comment, r.created_at, r.verified_booking, u.name
     FROM reviews r JOIN users u ON u.id = r.user_id
     WHERE r.guide_id = $1 ORDER BY r.created_at DESC LIMIT 20`,
    [g.id]
  );
  // Days already committed, so the booking form can grey them out.
  const busy = await query(
    `SELECT date FROM guide_bookings WHERE guide_id = $1 AND status IN ('pending','accepted')`,
    [g.id]
  );
  res.json({
    guide: {
      ...shapeGuide(g),
      reviews: reviews.map((r) => ({
        name: r.name, rating: r.rating, comment: r.comment,
        createdAt: r.created_at, verified: Boolean(r.verified_booking),
      })),
      busyDates: busy.map((b) => String(b.date).slice(0, 10)),
    },
  });
});

// ---- Guide portal ---------------------------------------------------------

const myGuide = async (userId) => one('SELECT * FROM guides WHERE user_id = $1', [userId]);

router.get('/me/dashboard', requireAuth('guide'), async (req, res) => {
  const g = await myGuide(req.user.sub);
  if (!g) return res.status(404).json({ error: 'No guide profile on this account.' });

  const rows = await query(
    `SELECT gb.*, b.reference, b.travel_date, b.passengers, u.name AS customer_name, u.phone AS customer_phone
     FROM guide_bookings gb
     JOIN bookings b ON b.id = gb.booking_id
     JOIN users u ON u.id = b.user_id
     WHERE gb.guide_id = $1 ORDER BY gb.date DESC`,
    [g.id]
  );
  const bookings = rows.map((r) => ({
    id: r.id, status: r.status, date: String(r.date).slice(0, 10),
    durationHrs: r.duration_hrs, reference: r.reference,
    customerName: r.customer_name, customerPhone: r.customer_phone,
    partySize: json(r.passengers).length,
  }));
  // Guides see their workload; the office handles what they are paid.
  res.json({
    profile: shapeGuide({ ...g, name: req.user.name }),
    bookings,
    workload: {
      pending: bookings.filter((b) => b.status === 'pending').length,
      accepted: bookings.filter((b) => b.status === 'accepted').length,
      completedTrips: bookings.filter((b) => b.status === 'completed').length,
    },
  });
});

router.post('/me/bookings/:id/:action', requireAuth('guide'), async (req, res) => {
  const { id, action } = req.params;
  const map = { accept: 'accepted', reject: 'rejected', complete: 'completed' };
  if (!map[action]) return res.status(400).json({ error: 'Unknown action.' });
  const g = await myGuide(req.user.sub);
  const gb = await one('SELECT * FROM guide_bookings WHERE id = $1 AND guide_id = $2',
    [Number(id), g?.id ?? 0]);
  if (!gb) return res.status(404).json({ error: 'Booking request not found.' });
  await query('UPDATE guide_bookings SET status = $1 WHERE id = $2', [map[action], gb.id]);
  res.json({ status: map[action] });
});

router.put('/me/profile', requireAuth('guide'), async (req, res) => {
  const g = await myGuide(req.user.sub);
  if (!g) return res.status(404).json({ error: 'No guide profile on this account.' });
  const { bio, languages, specialty, itineraries, idProofUrl } = req.body;
  await query(
    `UPDATE guides SET bio = $1, languages = $2, specialty = $3,
       itineraries = $4, id_proof_url = COALESCE($5, id_proof_url)
     WHERE id = $6`,
    [
      bio ?? g.bio, jsonParam(languages ?? json(g.languages)), specialty ?? g.specialty,
      jsonParam(itineraries ?? json(g.itineraries)), idProofUrl ?? null, g.id,
    ]
  );
  res.json({ saved: true });
});

export default router;
