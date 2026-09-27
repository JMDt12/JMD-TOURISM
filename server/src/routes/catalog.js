import express from 'express';
import { query, one, json } from '../db/index.js';
import { CITIES } from '../lib/geo.js';

const router = express.Router();

/** Cities we actually operate to, grouped for the search box. */
router.get('/cities', async (_req, res) => {
  const rows = await query('SELECT DISTINCT origin_city AS city FROM routes');
  const served = new Set(rows.map((r) => r.city));
  const dest = await query('SELECT DISTINCT destination_city AS city FROM routes');
  dest.forEach((r) => served.add(r.city));
  res.json({
    cities: [...served].sort().map((name) => ({
      name,
      region: CITIES[name]?.region ?? 'Other',
      state: CITIES[name]?.state ?? '',
      lat: CITIES[name]?.lat,
      lng: CITIES[name]?.lng,
    })),
  });
});

router.get('/pickup-points', async (req, res) => {
  const { city } = req.query;
  const rows = city
    ? await query('SELECT * FROM pickup_points WHERE city = $1 ORDER BY area_name', [city])
    : await query('SELECT * FROM pickup_points ORDER BY city, area_name');
  res.json({ pickupPoints: rows });
});

/** Popular routes for the homepage grid: cheapest fare and daily frequency. */
router.get('/popular-routes', async (_req, res) => {
  const rows = await query(
    `SELECT r.id, r.origin_city, r.destination_city, r.distance_km, r.base_duration_hrs,
            MAX(b.seat_capacity) AS max_capacity,
            COUNT(t.id) AS trip_count
     FROM routes r
     JOIN trips t ON t.route_id = r.id AND t.status = 'scheduled'
     JOIN buses b ON b.id = t.bus_id
     GROUP BY r.id, r.origin_city, r.destination_city, r.distance_km, r.base_duration_hrs
     ORDER BY trip_count DESC, r.distance_km ASC`
  );
  const featured = [
    'Delhi>Mathura', 'Delhi>Vrindavan', 'Noida>Mathura', 'Mathura>Vrindavan',
    'Mathura>Agra', 'Mathura>Barsana', 'Delhi>Shimla', 'Delhi>Nainital',
  ];
  const key = (r) => `${r.origin_city}>${r.destination_city}`;
  const ordered = featured
    .map((f) => rows.find((r) => key(r) === f))
    .filter(Boolean);
  res.json({ routes: ordered.length ? ordered : rows.slice(0, 8) });
});

router.get('/packages', async (req, res) => {
  const { type } = req.query;
  const rows = type
    ? await query('SELECT * FROM packages WHERE type = $1 ORDER BY duration_days', [type])
    : await query('SELECT * FROM packages ORDER BY duration_days');
  res.json({ packages: rows.map(shapePackage) });
});

router.get('/packages/:slug', async (req, res) => {
  const row = await one('SELECT * FROM packages WHERE slug = $1', [req.params.slug]);
  if (!row) return res.status(404).json({ error: 'Package not found.' });
  res.json({ package: shapePackage(row) });
});

function shapePackage(p) {
  return {
    id: p.id, slug: p.slug, title: p.title, type: p.type, summary: p.summary,
    heroImage: p.hero_image, durationDays: p.duration_days,
    baseCamp: p.base_camp,
    itinerary: json(p.itinerary), inclusions: json(p.inclusions), exclusions: json(p.exclusions),
  };
}

export default router;
