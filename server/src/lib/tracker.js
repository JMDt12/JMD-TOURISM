/**
 * Live trip tracking.
 *
 * Two sources feed the same pipeline:
 *   1. Real pushes from the driver portal (REST or the `driver:location` socket
 *      event), which is what production uses.
 *   2. A simulated GPS feed for trips flagged as simulated, so the tracking
 *      page and the HQ control map are demonstrable before any driver app
 *      exists.
 *
 * Simulated trips advance on a compressed clock (a 9-hour run finishes in a
 * few minutes) but report the road speed the route would actually imply, so
 * nothing on screen reads as nonsense.
 *
 * Every position is persisted to live_locations and broadcast to the
 * `trip:<id>` room, so a shared tracking link needs no login.
 */
import { query, one, json } from '../db/index.js';
import { CITIES, pointAlong, haversine } from './geo.js';

const TICK_MS = 4000;
// A simulated trip completes its whole route in this many minutes of wall clock.
const SIM_MINUTES = 12;

export class Tracker {
  constructor(io) {
    this.io = io;
    this.paths = new Map();   // tripId -> [{ name, lat, lng }]
    this.meta = new Map();    // tripId -> { km, hrs }
    this.sim = new Map();     // tripId -> { startedAt }
    this.latest = new Map();  // tripId -> position payload
    this.timer = null;
  }

  /** Origin, any stops we have coordinates for, then destination. */
  async pathFor(tripId) {
    if (this.paths.has(tripId)) return this.paths.get(tripId);
    const t = await one(
      `SELECT r.origin_city, r.destination_city, r.stops, r.base_duration_hrs
       FROM trips t JOIN routes r ON r.id = t.route_id WHERE t.id = $1`,
      [tripId]
    );
    if (!t) return null;
    const known = (name) => (CITIES[name] ? { name, ...CITIES[name] } : null);
    // Intermediate stops are highway towns; only those we have coordinates
    // for shape the line, the rest are labels on the itinerary.
    const path = [
      known(t.origin_city),
      ...json(t.stops).map((s) => known(s.name)).filter(Boolean),
      known(t.destination_city),
    ].filter(Boolean);

    let km = 0;
    for (let i = 1; i < path.length; i += 1) km += haversine(path[i - 1], path[i]);
    this.paths.set(tripId, path);
    this.meta.set(tripId, { km, hrs: Number(t.base_duration_hrs) || 1 });
    return path;
  }

  async startSimulation(tripId) {
    const path = await this.pathFor(tripId);
    if (!path || path.length < 2) return false;
    await query(`UPDATE trips SET status = 'ongoing' WHERE id = $1`, [tripId]);
    if (!this.sim.has(tripId)) this.sim.set(tripId, { startedAt: Date.now() });
    return true;
  }

  stopSimulation(tripId) {
    this.sim.delete(tripId);
  }

  /** Record a position from any source and fan it out. */
  async push(tripId, { lat, lng, speed = 0, progress = 0 }) {
    await query(
      `INSERT INTO live_locations (trip_id, lat, lng, speed_kmph, progress, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [tripId, lat, lng, Math.round(speed), progress, new Date().toISOString()]
    );
    const payload = {
      tripId, lat, lng, speed: Math.round(speed), progress,
      at: new Date().toISOString(),
    };
    this.latest.set(tripId, payload);
    this.io.to(`trip:${tripId}`).emit('trip:location', payload);
    this.io.to('hq').emit('hq:location', payload);
    return payload;
  }

  async latestFor(tripId) {
    if (this.latest.has(tripId)) return this.latest.get(tripId);
    const row = await one(
      'SELECT * FROM live_locations WHERE trip_id = $1 ORDER BY id DESC LIMIT 1',
      [tripId]
    );
    if (!row) return null;
    const payload = {
      tripId, lat: row.lat, lng: row.lng, speed: row.speed_kmph,
      progress: Number(row.progress), at: row.timestamp,
    };
    this.latest.set(tripId, payload);
    return payload;
  }

  async tick() {
    for (const [tripId, state] of this.sim) {
      const path = await this.pathFor(tripId);
      if (!path) { this.sim.delete(tripId); continue; }
      const { km, hrs } = this.meta.get(tripId) ?? { km: 0, hrs: 1 };
      const progress = Math.min(1, (Date.now() - state.startedAt) / 60000 / SIM_MINUTES);
      const pos = pointAlong(path, progress);
      // Report the speed the schedule implies, not the compressed sim clock.
      const cruising = km / hrs;
      const speed = progress >= 1 ? 0 : cruising * (0.8 + Math.random() * 0.35);
      await this.push(tripId, { ...pos, speed, progress });
      if (progress >= 1) {
        await query(`UPDATE trips SET status = 'completed' WHERE id = $1`, [tripId]);
        this.sim.delete(tripId);
        this.io.to(`trip:${tripId}`).emit('trip:completed', { tripId });
      }
    }
  }

  /**
   * Put a demo fleet on the road so the control room is not empty on a fresh
   * install. Trips left `ongoing` by a previous run are re-adopted first,
   * otherwise they would sit frozen on the map forever.
   */
  async seedSimulation(count = 6) {
    const adopted = await query(`SELECT id FROM trips WHERE status = 'ongoing' LIMIT $1`, [count]);
    for (const r of adopted) await this.startSimulation(r.id);

    const need = count - this.sim.size;
    if (need > 0) {
      const rows = await query(
        `SELECT id FROM trips WHERE status = 'scheduled'
         ORDER BY departure_datetime LIMIT $1`,
        [need * 4]
      );
      for (const r of rows) {
        if (this.sim.size >= count) break;
        await this.startSimulation(r.id);
      }
    }
    return [...this.sim.keys()];
  }

  run() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick().catch((e) => console.error('tracker', e)), TICK_MS);
    this.timer.unref?.();
  }
}

export function attachSockets(io, tracker) {
  io.on('connection', (socket) => {
    socket.on('trip:subscribe', async (tripId) => {
      socket.join(`trip:${tripId}`);
      const last = await tracker.latestFor(Number(tripId));
      if (last) socket.emit('trip:location', last);
    });
    socket.on('trip:unsubscribe', (tripId) => socket.leave(`trip:${tripId}`));
    socket.on('hq:subscribe', () => socket.join('hq'));
    // Real driver-app pushes land here.
    socket.on('driver:location', async ({ tripId, lat, lng, speed }) => {
      if (!tripId || typeof lat !== 'number' || typeof lng !== 'number') return;
      await tracker.push(Number(tripId), { lat, lng, speed: speed ?? 0, progress: 0 });
    });
  });
}
