import 'dotenv/config';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server as SocketServer } from 'socket.io';

import { migrate } from './db/index.js';
import { optionalAuth, USING_DEV_SECRET } from './lib/auth.js';
import { Tracker, attachSockets } from './lib/tracker.js';
import { WHATSAPP_CONFIGURED } from './lib/notify.js';

import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import tripRoutes from './routes/trips.js';
import bookingRoutes from './routes/bookings.js';
import guideRoutes from './routes/guides.js';
import rentalRoutes from './routes/rentals.js';
import seoRoutes from './routes/seo.js';
import reviewRoutes from './routes/reviews.js';
import adminRoutes from './routes/admin.js';
import trackingRoutes from './routes/tracking.js';
import driverRoutes from './routes/driver.js';

const PORT = Number(process.env.PORT || 4000);
// Trimmed: a value pasted into a host's settings box often carries a trailing
// newline, which is illegal in a header and fails every request with a 500.
// A browser's Origin never ends in a slash, so one here would never match.
const ORIGIN = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').trim().replace(/\/$/, '');

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, { cors: { origin: ORIGIN } });
const tracker = new Tracker(io);

// Behind a host's proxy every request arrives from the proxy's address, which
// would make the per-address login limit lock out everyone at once. Set
// TRUST_PROXY to the number of proxies in front (usually 1) so req.ip is the
// visitor's own address.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
app.use(cors({ origin: ORIGIN }));
app.use(express.json({ limit: '1mb' }));
app.use(optionalAuth);

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    whatsapp: WHATSAPP_CONFIGURED ? 'live' : 'simulated',
    mapsProvider: process.env.GOOGLE_MAPS_API_KEY ? 'google' : 'built-in',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/guides', guideRoutes);
app.use('/api/rentals', rentalRoutes);
// Crawler files live at the root, not under /api.
app.use('/', seoRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tracking', trackingRoutes(tracker));
app.use('/api/driver', driverRoutes(tracker));

app.use((req, res) => res.status(404).json({ error: `No route for ${req.method} ${req.path}` }));

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity.
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong at our end. Please try again.' });
});

async function start() {
  const dialect = await migrate();
  attachSockets(io, tracker);
  tracker.run();

  // Put a few buses on the road so the control room and the tracking page
  // have something to show on a fresh install.
  if (process.env.SIMULATE_TRIPS !== 'off') {
    const started = await tracker.seedSimulation(6);
    if (started.length) console.log(`Simulating ${started.length} live trips (SIMULATE_TRIPS=off to disable)`);
  }

  server.listen(PORT, () => {
    console.log(`API on http://localhost:${PORT}  (db: ${dialect})`);
    const warnings = [];
    if (USING_DEV_SECRET) warnings.push('JWT_SECRET is unset, using the insecure dev secret');
    if (!WHATSAPP_CONFIGURED) warnings.push('WhatsApp not configured, messages are simulated and logged');
    if (!process.env.GOOGLE_MAPS_API_KEY) warnings.push('No maps key, using the built-in SVG map');
    if (warnings.length) console.log(warnings.map((w) => `  ! ${w}`).join('\n'));
  });
}

start().catch((e) => { console.error(e); process.exit(1); });
