/**
 * robots.txt and sitemap.xml.
 *
 * The sitemap is generated from the database rather than hand-written, so a
 * new tour, vehicle or guide is discoverable the day it is added instead of
 * whenever someone remembers to update a file.
 *
 * Set SITE_URL in the environment to the live domain; without it the URLs
 * point at localhost, which is correct for development and useless in
 * production, so this is one to remember before going live.
 */
import express from 'express';
import { query } from '../db/index.js';

const router = express.Router();

const SITE_URL = (process.env.SITE_URL || 'http://localhost:5173').replace(/\/$/, '');

/** Slugs kept in step with client/src/lib/destinations.js. */
const DESTINATIONS = [
  'mathura', 'vrindavan', 'gokul', 'barsana', 'govardhan',
  'agra', 'ayodhya', 'varanasi', 'bharatpur',
];

const STATIC_PAGES = [
  ['/', 1.0, 'daily'],
  ['/destinations', 0.9, 'weekly'],
  ['/search', 0.8, 'daily'],
  ['/packages', 0.8, 'weekly'],
  ['/cars', 0.8, 'weekly'],
  ['/bikes', 0.8, 'weekly'],
  ['/stays', 0.8, 'weekly'],
  ['/guides', 0.7, 'weekly'],
  ['/about', 0.6, 'monthly'],
  ['/contact', 0.6, 'monthly'],
  ['/tracker', 0.4, 'monthly'],
];

const xmlEscape = (s) =>
  String(s).replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

router.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(
    [
      'User-agent: *',
      'Allow: /',
      '',
      '# Nothing useful behind a login, and nothing we want indexed.',
      'Disallow: /hq',
      'Disallow: /guide-portal',
      'Disallow: /driver-portal',
      'Disallow: /my-trips',
      'Disallow: /profile',
      'Disallow: /book',
      'Disallow: /confirmation/',
      '',
      `Sitemap: ${SITE_URL}/sitemap.xml`,
      '',
    ].join('\n')
  );
});

router.get('/sitemap.xml', async (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [];

  const add = (path, priority, changefreq) =>
    urls.push({ loc: `${SITE_URL}${path}`, priority, changefreq, lastmod: today });

  for (const [path, priority, changefreq] of STATIC_PAGES) add(path, priority, changefreq);
  for (const slug of DESTINATIONS) add(`/destinations/${slug}`, 0.9, 'monthly');

  const packages = await query('SELECT slug FROM packages ORDER BY id');
  for (const p of packages) add(`/packages/${p.slug}`, 0.9, 'weekly');

  const rentals = await query('SELECT id FROM rentals WHERE active = true ORDER BY id');
  for (const r of rentals) add(`/hire/${r.id}`, 0.6, 'weekly');

  const guides = await query(
    `SELECT id FROM guides WHERE verification_status = 'verified' ORDER BY id`
  );
  for (const g of guides) add(`/guides/${g.id}`, 0.6, 'monthly');

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls
      .map(
        (u) =>
          '  <url>\n' +
          `    <loc>${xmlEscape(u.loc)}</loc>\n` +
          `    <lastmod>${u.lastmod}</lastmod>\n` +
          `    <changefreq>${u.changefreq}</changefreq>\n` +
          `    <priority>${u.priority.toFixed(1)}</priority>\n` +
          '  </url>'
      )
      .join('\n') +
    '\n</urlset>\n';

  res.type('application/xml').send(body);
});

export default router;
