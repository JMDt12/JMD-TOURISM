/**
 * Seeds a demo dataset covering the Braj circuit, the Delhi/Noida feeder
 * cities and the hill-station routes, so every screen has real-looking data
 * to render before any live operations exist.
 *
 * Run with: npm run seed --workspace=server   (add --fresh to wipe first)
 */
import 'dotenv/config';
import '../lib/timezone.js';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { query, migrate, getDb, json, jsonParam } from './index.js';
import { CITIES, haversine } from '../lib/geo.js';
import { LAYOUTS, allSeats } from '../lib/seats.js';

const FRESH = process.argv.includes('--fresh');

const TABLES = [
  'notifications', 'reviews', 'live_locations', 'guide_bookings',
  'bookings', 'guides', 'packages', 'rentals', 'pickup_points', 'trips', 'routes',
  'buses', 'otp_codes', 'login_failures', 'users',
];

async function wipe() {
  const db = await getDb();
  for (const t of TABLES) {
    await db.query(`DELETE FROM ${t}`).catch(() => {});
  }
  if (db.dialect === 'sqlite') {
    await db.query('DELETE FROM sqlite_sequence').catch(() => {});
  } else {
    for (const t of TABLES) {
      await db.query(`ALTER SEQUENCE ${t}_id_seq RESTART WITH 1`).catch(() => {});
    }
  }
}

const insert = async (table, row) => {
  const cols = Object.keys(row);
  const ph = cols.map((_, i) => `$${i + 1}`).join(', ');
  const rows = await query(
    `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${ph}) RETURNING id`,
    Object.values(row)
  );
  return rows[0].id;
};

const refCode = (name) =>
  `${name.split(' ')[0].toUpperCase().slice(0, 5)}${Math.floor(1000 + Math.random() * 9000)}`;

/** Departure timestamps for the next `days` days, at the given local hours. */
function schedule(days, hours) {
  const out = [];
  const base = new Date();
  base.setMinutes(0, 0, 0);
  for (let d = 0; d < days; d += 1) {
    for (const h of hours) {
      const dt = new Date(base);
      dt.setDate(base.getDate() + d);
      dt.setHours(h, 0, 0, 0);
      if (dt > new Date()) out.push(dt);
    }
  }
  return out;
}

async function seed() {
  const dialect = await migrate();
  if (FRESH) await wipe();

  const existing = await query('SELECT id FROM users LIMIT 1');
  if (existing.length && !FRESH) {
    console.log('Database already seeded. Re-run with --fresh to reset.');
    return;
  }

  // demo1234 is published in the README, so it is only acceptable on the
  // throwaway local SQLite file. A real database gets a random password.
  const password = process.env.SEED_PASSWORD
    || (dialect === 'postgres' ? randomBytes(9).toString('base64url') : 'demo1234');
  const pw = await bcrypt.hash(password, 10);

  // ---- People -------------------------------------------------------------
  await insert('users', {
    name: 'HQ Control Room', email: 'office@jmdtourism.in', phone: '9000000001',
    password_hash: pw, role: 'admin', referral_code: refCode('HQ'),
  });

  const driverNames = ['Ramesh Chaudhary', 'Devendra Singh', 'Mohan Lal Sharma', 'Jitendra Yadav'];
  const driverPhones = ['9000000011', '9000000012', '9000000013', '9000000014'];
  const drivers = [];
  for (let i = 0; i < driverNames.length; i += 1) {
    drivers.push(await insert('users', {
      name: driverNames[i], phone: driverPhones[i], password_hash: pw,
      role: 'driver', referral_code: refCode(driverNames[i]),
    }));
  }

  const customer = await insert('users', {
    name: 'Demo Traveller', email: 'demo@example.com', phone: '9812345678',
    password_hash: pw, role: 'customer', referral_code: refCode('Demo'), loyalty_points: 250,
  });

  // ---- Guides -------------------------------------------------------------
  const guideSeed = [
    {
      name: 'Pandit Girraj Kishore', phone: '9000000021',
      languages: ['Hindi', 'English', 'Braj Bhasha'],
      specialty: 'Temple history and Braj parikrama', base_city: 'Vrindavan', years_experience: 14, rating_avg: 4.9, rating_count: 212,
      verification_status: 'verified',
      bio: 'Fourteen years walking the Vrindavan parikrama marg. Knows which temples open when, and the door nobody queues at.',
      itineraries: [
        { title: 'Half-day Vrindavan', hours: 4, stops: ['Banke Bihari', 'Prem Mandir', 'ISKCON', 'Nidhivan'] },
        { title: 'Full-day Braj Circuit', hours: 9, stops: ['Janmabhoomi', 'Vrindavan', 'Barsana', 'Nandgaon', 'Govardhan'] },
      ],
    },
    {
      name: 'Sunita Devi', phone: '9000000022', languages: ['Hindi', 'English'],
      specialty: 'Women and family groups, Barsana', base_city: 'Barsana', years_experience: 8, rating_avg: 4.8, rating_count: 96,
      verification_status: 'verified',
      bio: 'Barsana born. Leads family and women-only groups up the Radha Rani hill at the pace the group actually wants.',
      itineraries: [
        { title: 'Barsana and Nandgaon half-day', hours: 5, stops: ['Radha Rani Temple', 'Prem Sarovar', 'Nandgaon'] },
      ],
    },
    {
      name: 'Imran Khan', phone: '9000000023',
      languages: ['Hindi', 'English', 'Urdu', 'French'],
      specialty: 'Mughal heritage, Agra', base_city: 'Agra', years_experience: 11, rating_avg: 4.7, rating_count: 158,
      verification_status: 'verified',
      bio: 'Ministry-licensed Agra guide. Runs the Taj at sunrise so you are out before the crowd builds.',
      itineraries: [
        { title: 'Taj at sunrise and Agra Fort', hours: 6, stops: ['Taj Mahal', 'Agra Fort', 'Mehtab Bagh'] },
      ],
    },
    {
      name: 'Bhupendra Rawat', phone: '9000000024',
      languages: ['Hindi', 'English', 'Garhwali'],
      specialty: 'Himalayan treks and hill circuits', base_city: 'Mussoorie', years_experience: 9, rating_avg: 4.6, rating_count: 74,
      verification_status: 'verified',
      bio: 'Mussoorie and Nainital day walks, plus the Nag Tibba overnight for groups who want the ridge to themselves.',
      itineraries: [
        { title: 'Mussoorie ridge walk', hours: 5, stops: ['Camel Back Road', 'Gun Hill', 'Company Garden'] },
      ],
    },
    {
      name: 'Radha Sharma', phone: '9000000025',
      languages: ['Hindi', 'English', 'Bengali'],
      specialty: 'Photography walks, Mathura ghats', base_city: 'Mathura', years_experience: 5, rating_avg: 4.5, rating_count: 41,
      verification_status: 'verified',
      bio: 'Dawn on the Yamuna ghats, aarti from the right bank, and the lanes behind Vishram Ghat most visitors miss.',
      itineraries: [
        { title: 'Yamuna ghats at dawn', hours: 3, stops: ['Vishram Ghat', 'Dwarkadhish Temple', 'Old bazaar'] },
      ],
    },
    {
      name: 'Naveen Agarwal', phone: '9000000026', languages: ['Hindi', 'English'],
      specialty: 'Govardhan parikrama', base_city: 'Govardhan', years_experience: 3, rating_avg: 0, rating_count: 0,
      verification_status: 'pending',
      bio: 'Applying to lead the 21 km Govardhan parikrama, day and night circuits.',
      itineraries: [
        { title: 'Govardhan parikrama (21 km)', hours: 8, stops: ['Daan Ghati', 'Radha Kund', 'Kusum Sarovar', 'Mansi Ganga'] },
      ],
    },
  ];

  const guideIds = [];
  for (const g of guideSeed) {
    const uid = await insert('users', {
      name: g.name, phone: g.phone, password_hash: pw, role: 'guide', referral_code: refCode(g.name),
    });
    guideIds.push(await insert('guides', {
      user_id: uid, photo: null, bio: g.bio,
      languages: jsonParam(g.languages), specialty: g.specialty, base_city: g.base_city,
      years_experience: g.years_experience,
      rating_avg: g.rating_avg, rating_count: g.rating_count,
      verification_status: g.verification_status,
      id_proof_url: g.verification_status === 'pending' ? 'uploads/pending-id.pdf' : 'uploads/verified-id.pdf',
      itineraries: jsonParam(g.itineraries),
    }));
  }

  // ---- Pickup points ------------------------------------------------------
  const pickups = [
    ['Delhi', 'Kashmere Gate ISBT', 'Gate 3, near Metro exit', 28.6672, 77.2286],
    ['Delhi', 'Akshardham Metro', 'Pillar 47, NH-24 side', 28.6127, 77.2773],
    ['Delhi', 'Dwarka Sector 21', 'Metro station bus bay', 28.5522, 77.0583],
    ['Noida', 'Sector 18 Atta Market', 'Opposite Wave Cinema', 28.5708, 77.3260],
    ['Noida', 'Botanical Garden Metro', 'Bay 2, Gate 1', 28.5644, 77.3340],
    ['Noida', 'Pari Chowk', 'Greater Noida, near Alpha Commercial', 28.4696, 77.5040],
    ['Mathura', 'Mathura Junction railway station', 'Platform 1 exit, taxi stand — pickup and drop', 27.4839, 77.6704],
    ['Mathura', 'Krishna Janmabhoomi', 'Main gate parking', 27.5049, 77.6698],
    ['Mathura', 'Bhuteshwar Crossing', 'Near NH-19 flyover', 27.4988, 77.6612],
    ['Vrindavan', 'Chhatikara Bypass', 'ISKCON side service road', 27.5504, 77.6612],
    ['Vrindavan', 'Parikrama Marg', 'Near Prem Mandir gate 2', 27.5773, 77.6968],
  ];
  const pickupIds = {};
  for (const [city, area, landmark, lat, lng] of pickups) {
    const id = await insert('pickup_points', { city, area_name: area, landmark, lat, lng });
    (pickupIds[city] ||= []).push(id);
  }

  // ---- Fleet --------------------------------------------------------------
  const busSeed = [
    ['Braj Express 01', 'ac_seater', 'ac_seater_2x2', 'UP85 AT 4501', 0, ['AC', 'Charging point', 'Water bottle', 'Reading light']],
    ['Braj Express 02', 'ac_seater', 'ac_seater_2x2', 'UP85 AT 4502', 1, ['AC', 'Charging point', 'Water bottle', 'CCTV']],
    ['Yamuna Sleeper 01', 'ac_sleeper', 'ac_sleeper_2x1', 'UP85 BT 7701', 2, ['AC', 'Blanket', 'Curtains', 'Charging point', 'CCTV']],
    ['Yamuna Sleeper 02', 'sleeper', 'sleeper_2x1', 'UP85 BT 7702', 3, ['Blanket', 'Curtains', 'Charging point']],
    ['Giriraj Volvo', 'ac_sleeper', 'ac_sleeper_2x1', 'UP85 CT 9001', 0, ['AC', 'Volvo B9R', 'Blanket', 'Wi-Fi', 'CCTV', 'Live tracking']],
    ['Barsana Local', 'non_ac_seater', 'seater_2x2', 'UP85 DT 2201', 1, ['Pushback seats', 'Water bottle']],
    ['Braj Tempo 01', 'tempo', 'tempo_12', 'UP85 ET 1101', 2, ['AC', 'Music system', 'Water bottle']],
    ['Braj Tempo 02', 'tempo', 'tempo_12', 'UP85 ET 1102', 3, ['AC', 'Music system']],
  ];
  const buses = [];
  for (const [name, type, layoutKey, reg, dIdx, amenities] of busSeed) {
    const layout = LAYOUTS[layoutKey];
    const id = await insert('buses', {
      operator_id: drivers[dIdx], name, type,
      seat_capacity: allSeats(layout).length,
      seat_layout: jsonParam(layout),
      registration_no: reg,
      photos: jsonParam([]),
      amenities: jsonParam(amenities),
      driver_name: driverNames[dIdx], driver_phone: driverPhones[dIdx], driver_photo: null,
    });
    buses.push({ id, type, capacity: allSeats(layout).length });
  }

  // ---- Routes -------------------------------------------------------------
  const routeSeed = [
    ['Delhi', 'Mathura', ['Faridabad', 'Palwal', 'Kosi Kalan'], 3.5],
    ['Delhi', 'Vrindavan', ['Faridabad', 'Palwal', 'Chhatikara'], 3.8],
    ['Noida', 'Mathura', ['Pari Chowk', 'Jewar', 'Kosi Kalan'], 3.2],
    ['Noida', 'Vrindavan', ['Pari Chowk', 'Jewar', 'Chhatikara'], 3.5],
    ['Mathura', 'Vrindavan', ['Bhuteshwar', 'Chhatikara'], 0.6],
    ['Mathura', 'Barsana', ['Govardhan', 'Nandgaon'], 1.6],
    ['Mathura', 'Govardhan', ['Radha Kund'], 0.9],
    ['Mathura', 'Agra', ['Farah', 'Runakta'], 1.5],
    ['Mathura', 'Bharatpur', ['Govardhan', 'Deeg'], 1.4],
    ['Vrindavan', 'Agra', ['Mathura', 'Farah'], 2.0],
    ['Delhi', 'Shimla', ['Panipat', 'Ambala', 'Solan'], 8.5],
    ['Delhi', 'Manali', ['Panipat', 'Ambala', 'Mandi'], 13.0],
    ['Delhi', 'Nainital', ['Hapur', 'Moradabad', 'Haldwani'], 7.5],
    ['Delhi', 'Mussoorie', ['Meerut', 'Roorkee', 'Dehradun'], 7.0],
    ['Mathura', 'Nainital', ['Aligarh', 'Moradabad', 'Haldwani'], 9.5],
    ['Mathura', 'Shimla', ['Delhi', 'Ambala', 'Solan'], 12.0],
    // The eastern run to Kashi. Long overnight hauls on the sleeper coaches.
    ['Agra', 'Varanasi', ['Etawah', 'Kanpur', 'Prayagraj'], 11.0],
    ['Mathura', 'Varanasi', ['Agra', 'Kanpur', 'Prayagraj'], 12.5],
    ['Delhi', 'Varanasi', ['Agra', 'Kanpur', 'Prayagraj'], 13.5],
    // Ayodhya, since the Ram Mandir opened, is the other pilgrimage people
    // ask us to pair with Braj.
    ['Mathura', 'Ayodhya', ['Agra', 'Kanpur', 'Lucknow'], 11.0],
    ['Delhi', 'Ayodhya', ['Aligarh', 'Kanpur', 'Lucknow'], 12.5],
    ['Varanasi', 'Ayodhya', ['Jaunpur', 'Sultanpur'], 4.5],
  ];
  const routes = [];
  for (const [origin, dest, stops, hrs] of routeSeed) {
    const km = Math.round(haversine(CITIES[origin], CITIES[dest]) * 1.28);
    const forward = await insert('routes', {
      origin_city: origin, destination_city: dest,
      distance_km: km, base_duration_hrs: hrs,
      stops: jsonParam(stops.map((s) => ({ name: s }))),
    });
    routes.push({ id: forward, origin, dest, hrs, km });
    // Seed the return leg too, so search works in both directions.
    const back = await insert('routes', {
      origin_city: dest, destination_city: origin,
      distance_km: km, base_duration_hrs: hrs,
      stops: jsonParam([...stops].reverse().map((s) => ({ name: s }))),
    });
    routes.push({ id: back, origin: dest, dest: origin, hrs, km });
  }

  // ---- Trips --------------------------------------------------------------
  // Short Braj hops run through the day; long hauls are overnight departures.
  let tripCount = 0;
  for (const route of routes) {
    const long = route.hrs >= 6;
    const hours = long ? [20, 22] : route.hrs >= 3 ? [6, 9, 14, 17, 21] : [7, 10, 13, 16, 19];
    const candidates = long
      ? buses.filter((b) => b.type.includes('sleeper'))
      : buses.filter((b) => !b.type.includes('sleeper'));
    const fleet = candidates.length ? candidates : buses;
    const departures = schedule(14, hours);
    for (let i = 0; i < departures.length; i += 1) {
      const dep = departures[i];
      const bus = fleet[(route.id + i) % fleet.length];
      const arrive = new Date(dep.getTime() + route.hrs * 3600 * 1000);
      // Buses are chartered whole, so a trip is either open or taken.
      await insert('trips', {
        bus_id: bus.id, route_id: route.id,
        departure_datetime: dep.toISOString(), arrival_datetime: arrive.toISOString(),
        seats_available: bus.capacity, status: 'scheduled',
      });
      tripCount += 1;
    }
  }

  // ---- Cars, bikes and rooms ----------------------------------------------
  // Quantity matters: a hotel has several of a room type and a hire shop has
  // several of the same scooter, so availability is "how many are left on
  // these dates", not "is this one thing free".
  const rentalSeed = [
    // --- Cars, all with our own drivers -----------------------------------
    {
      kind: 'car', name: 'Maruti Suzuki Dzire', subtitle: 'Sedan with driver',
      city: 'Mathura', area: 'Station Road', quantity: 4, with_driver: true,
      specs: { seats: 4, luggage: '2 large bags', transmission: 'Manual', fuel: 'Petrol', ac: 'Yes' },
      features: ['Driver included', 'AC', 'Toll and parking billed at actuals', 'First aid kit'],
    },
    {
      kind: 'car', name: 'Toyota Innova Crysta', subtitle: 'MPV with driver',
      city: 'Mathura', area: 'Station Road', quantity: 3, with_driver: true,
      specs: { seats: 6, luggage: '4 large bags', transmission: 'Manual', fuel: 'Diesel', ac: 'Yes' },
      features: ['Driver included', 'AC', 'Captain seats', 'Charging points', 'Good for the Agra run'],
    },
    {
      kind: 'car', name: 'Toyota Innova Hycross', subtitle: 'Seven-seat MPV with driver',
      city: 'Vrindavan', area: 'Chhatikara', quantity: 2, with_driver: true,
      specs: { seats: 7, luggage: '3 large bags', transmission: 'Automatic', fuel: 'Hybrid', ac: 'Yes' },
      features: ['Driver included', 'AC', 'Quiet hybrid', 'Charging points'],
    },
    {
      kind: 'car', name: 'Force Urbania', subtitle: 'Van with driver, for larger families',
      city: 'Mathura', area: 'Bhuteshwar', quantity: 2, with_driver: true,
      specs: { seats: 13, luggage: '6 large bags', transmission: 'Manual', fuel: 'Diesel', ac: 'Yes' },
      features: ['Driver included', 'AC', 'Pushback seats', 'Standing headroom'],
    },
    {
      kind: 'car', name: 'Maruti Suzuki Ertiga', subtitle: 'Compact MPV with driver',
      city: 'Agra', area: 'Taj Ganj', quantity: 3, with_driver: true,
      specs: { seats: 6, luggage: '2 large bags', transmission: 'Manual', fuel: 'CNG', ac: 'Yes' },
      features: ['Driver included', 'AC', 'Economical on the Agra circuit'],
    },

    // --- Bikes and scooters, self-ride ------------------------------------
    {
      kind: 'bike', name: 'Honda Activa 6G', subtitle: 'Scooter, self-ride',
      city: 'Vrindavan', area: 'Parikrama Marg', quantity: 8,
      specs: { engine: '110 cc', mileage: '45 kmpl', gears: 'Automatic', seats: 2 },
      features: ['Two helmets included', 'Easiest thing for the Vrindavan lanes', 'Fuel not included', 'Original ID held as deposit'],
    },
    {
      kind: 'bike', name: 'TVS Jupiter', subtitle: 'Scooter, self-ride',
      city: 'Mathura', area: 'Krishna Janmabhoomi', quantity: 6,
      specs: { engine: '110 cc', mileage: '48 kmpl', gears: 'Automatic', seats: 2 },
      features: ['Two helmets included', 'Large under-seat storage', 'Fuel not included'],
    },
    {
      kind: 'bike', name: 'Royal Enfield Classic 350', subtitle: 'Motorcycle, self-ride',
      city: 'Mathura', area: 'Station Road', quantity: 3,
      specs: { engine: '349 cc', mileage: '35 kmpl', gears: '5-speed manual', seats: 2 },
      features: ['Two helmets included', 'Built for the Govardhan and Barsana runs', 'Valid licence required', 'Fuel not included'],
    },
    {
      kind: 'bike', name: 'Hero Splendor Plus', subtitle: 'Motorcycle, self-ride',
      city: 'Mathura', area: 'Bhuteshwar', quantity: 5,
      specs: { engine: '97 cc', mileage: '60 kmpl', gears: '4-speed manual', seats: 2 },
      features: ['Two helmets included', 'Cheapest way around town', 'Fuel not included'],
    },
    {
      kind: 'bike', name: 'Honda Activa 6G', subtitle: 'Scooter, self-ride',
      city: 'Agra', area: 'Taj Ganj', quantity: 4,
      specs: { engine: '110 cc', mileage: '45 kmpl', gears: 'Automatic', seats: 2 },
      features: ['Two helmets included', 'Handy between the Taj and the Fort', 'Fuel not included'],
    },

    // --- Rooms ------------------------------------------------------------
    {
      kind: 'room', name: 'Standard Double Room', subtitle: 'Yamuna Residency, Mathura',
      city: 'Mathura', area: 'Station Road, 400 m from Mathura Junction', quantity: 12,
      specs: { occupancy: 2, bed: 'One double', size: '180 sq ft', bathroom: 'Attached, hot water' },
      features: ['AC', 'Wi-Fi', 'Daily housekeeping', 'Vegetarian kitchen on site', 'Walk to Janmabhoomi'],
    },
    {
      kind: 'room', name: 'Deluxe Family Room', subtitle: 'Yamuna Residency, Mathura',
      city: 'Mathura', area: 'Station Road, 400 m from Mathura Junction', quantity: 6,
      specs: { occupancy: 4, bed: 'One double, two singles', size: '320 sq ft', bathroom: 'Attached, hot water' },
      features: ['AC', 'Wi-Fi', 'Balcony', 'Vegetarian kitchen on site', 'Extra mattress on request'],
    },
    {
      kind: 'room', name: 'Garden View Room', subtitle: 'Braj Nivas, Vrindavan',
      city: 'Vrindavan', area: 'Parikrama Marg, near Prem Mandir', quantity: 10,
      specs: { occupancy: 2, bed: 'One double', size: '200 sq ft', bathroom: 'Attached, hot water' },
      features: ['AC', 'Wi-Fi', 'Quiet garden side', 'Walk to Prem Mandir and ISKCON', 'Satvik meals'],
    },
    {
      kind: 'room', name: 'Dormitory Bed', subtitle: 'Braj Nivas, Vrindavan',
      city: 'Vrindavan', area: 'Parikrama Marg, near Prem Mandir', quantity: 24,
      specs: { occupancy: 1, bed: 'One bunk bed, shared room', size: 'Shared hall', bathroom: 'Shared, hot water' },
      features: ['Fan', 'Lockers', 'Best for large yatra groups', 'Satvik meals', 'Separate halls for men and women'],
    },
    {
      kind: 'room', name: 'Base Camp Twin Room', subtitle: 'Giriraj House, Govardhan',
      city: 'Govardhan', area: 'Daan Ghati, on the parikrama marg', quantity: 8,
      specs: { occupancy: 2, bed: 'Two singles', size: '190 sq ft', bathroom: 'Attached, hot water' },
      features: ['AC', 'On the parikrama route', 'Early breakfast for 04:30 starts', 'Luggage room'],
    },
    {
      kind: 'room', name: 'Heritage Double Room', subtitle: 'Taj Ganj Haveli, Agra',
      city: 'Agra', area: 'Taj Ganj, 700 m from the south gate', quantity: 9,
      specs: { occupancy: 2, bed: 'One double', size: '220 sq ft', bathroom: 'Attached, hot water' },
      features: ['AC', 'Wi-Fi', 'Rooftop with a Taj view', 'Walk to the south gate for sunrise'],
    },
  ];

  for (const r of rentalSeed) {
    await insert('rentals', {
      kind: r.kind, name: r.name, subtitle: r.subtitle ?? null,
      city: r.city, area: r.area ?? null,
      quantity: r.quantity, min_days: r.min_days ?? 1,
      with_driver: r.with_driver ?? false,
      specs: jsonParam(r.specs ?? {}),
      features: jsonParam(r.features ?? []),
      photos: jsonParam([]),
      active: true,
    });
  }

  // ---- Packages -----------------------------------------------------------
  // One package: the whole Braj mandal, run out of a single Mathura hotel.
  // Every town here sits within ~50 km of Mathura, so the trip is genuinely
  // hub-and-spoke — you unpack once and each day is a loop out and back.
  // Temples are named per day because "and other temples" is what an
  // aggregator writes when it does not know the ground.
  const packageSeed = [
    {
      // A true loop rather than a hub trip: Mathura, then south to Agra, west
      // to Akbar's abandoned capital, north through Bharatpur and Deeg, and
      // back into Braj. About 220 km of driving over four days.
      slug: 'mathura-agra-circuit-4d',
      title: 'Krishna and the Mughals: Mathura, Vrindavan, Agra, Fatehpur Sikri, Bharatpur and Deeg',
      type: 'heritage', duration_days: 4, base_camp: null,
      summary:
        'Four days across the two worlds that sit an hour apart. Krishna’s Braj to start, then the Mughal capitals — the Taj at sunrise, Akbar’s ghost city at Fatehpur Sikri — and back through the bird lake at Bharatpur and the water palace at Deeg. One coach, one driver, the whole loop.',
      inclusions: [
        'Your own AC coach and driver for all four days, Delhi/Noida pickup to final drop',
        '3 nights hotel (1 Mathura, 1 Agra, 1 Bharatpur)',
        'Verified local guide in Braj, and a licensed guide in Agra and Fatehpur Sikri',
        'Cycle-rickshaw safari inside Keoladeo National Park',
        'Breakfast and dinner every day',
        'All tolls, the Rajasthan state permit and driver allowances',
      ],
      exclusions: [
        'Monument tickets (Taj Mahal, Agra Fort, Fatehpur Sikri, Keoladeo, Deeg Palace)',
        'Lunch',
        'Temple donations and VIP darshan tickets',
        'Personal expenses',
      ],
      itinerary: [
        {
          day: 1,
          title: 'Mathura and Vrindavan: the Braj half',
          detail:
            'Pickup from Delhi or Noida at 05:30, Mathura by midday. The Janmasthan and Dwarkadhish in the afternoon, then across to Vrindavan for Banke Bihari and Prem Mandir. Back to Vishram Ghat for the evening Yamuna aarti. Night in Mathura.',
          stops: ['Mathura', 'Vrindavan'],
          temples: [
            'Shri Krishna Janmasthan',
            'Dwarkadhish Temple',
            'Vishram Ghat — evening aarti',
            'Shri Banke Bihari Temple',
            'Prem Mandir',
            'ISKCON Krishna Balaram Mandir',
            'Nidhivan',
          ],
        },
        {
          day: 2,
          title: 'South to Agra: the fort, the Baby Taj, and the Taj at sunset',
          detail:
            'The 62 km run down to Agra after breakfast. Agra Fort through the middle of the day — Shah Jahan spent his last years locked in it, looking at what he built. Itmad-ud-Daulah in the afternoon, the inlay work that the Taj later copied at scale. Then Mehtab Bagh across the river at sunset, where the Taj turns amber and nobody is selling you anything. Night in Agra.',
          stops: ['Agra'],
          temples: [
            'Agra Fort (Diwan-i-Am, Musamman Burj)',
            'Itmad-ud-Daulah, the Baby Taj',
            'Mehtab Bagh at sunset',
            'Jama Masjid, Agra',
          ],
        },
        {
          day: 3,
          title: 'Taj at sunrise, then Akbar\'s abandoned city',
          detail:
            'At the gate before it opens, inside for first light — the marble goes pink, then white, and the crowd has not arrived. Breakfast, then 40 km west to Fatehpur Sikri: Akbar built a capital here in red sandstone, used it for fourteen years, and walked away when the water ran out. Buland Darwaza, the Salim Chishti dargah where people still tie threads, Panch Mahal and Jodha Bai\'s palace. On to Bharatpur for the night. Note the Taj is closed on Fridays — tell us your dates and we sequence around it.',
          stops: ['Agra', 'Fatehpur Sikri', 'Bharatpur'],
          temples: [
            'Taj Mahal at sunrise',
            'Buland Darwaza',
            'Jama Masjid, Fatehpur Sikri',
            'Sheikh Salim Chishti Dargah',
            'Panch Mahal',
            'Diwan-i-Khas',
            'Jodha Bai Palace',
          ],
        },
        {
          day: 4,
          title: 'Bharatpur birds, Deeg fountains, then home through Govardhan',
          detail:
            'Into Keoladeo at dawn by cycle-rickshaw, because engines are not allowed and the rickshaw-wallahs know every heronry — painted storks, sarus cranes, and in winter the migrants. Late morning to Deeg, where the Jat rulers built a palace with a monsoon roof that drums like rain over the water gardens. Govardhan on the way back for Daan Ghati and Kusum Sarovar, then your drop.',
          stops: ['Bharatpur', 'Deeg', 'Govardhan'],
          temples: [
            'Keoladeo Ghana National Park',
            'Deeg Palace and Gopal Bhavan',
            'Deeg water gardens',
            'Daan Ghati Mandir, Govardhan',
            'Kusum Sarovar',
          ],
        },
      ],
    },
    {
      slug: 'complete-braj-darshan-5d',
      title: 'Complete Braj Darshan: Mathura, Vrindavan, Gokul, Barsana, Nandgaon and Govardhan',
      type: 'religious', duration_days: 5, base_camp: 'Mathura',
      summary:
        'Five days and every temple in Braj that matters, from Krishna’s birth-cell at the Janmasthan to the Radha Rani hill at Barsana and the Govardhan parikrama. One hotel in Mathura the whole time, one coach, one guide who already knows your group by day two.',
      inclusions: [
        'Your own AC coach and driver for all five days, Delhi/Noida pickup to final drop',
        '4 nights in Mathura — one hotel, you unpack once',
        'Verified Braj guide every day, in Hindi or English',
        'Darshan queue assistance at Banke Bihari, Ladli Ji and Dwarkadhish',
        'Breakfast and dinner daily',
        'Support vehicle on the Govardhan parikrama',
        'All tolls, parking, state permits and driver allowances',
      ],
      exclusions: [
        'Lunch',
        'Temple donations, pandit dakshina and VIP darshan tickets',
        'Government Museum entry',
        'Personal expenses',
      ],
      itinerary: [
        {
          day: 1,
          title: 'Mathura: the birth-cell, the Shiva guardians and aarti on the Yamuna',
          detail:
            'Pickup from Delhi or Noida at 05:30, Mathura by midday. Afternoon at the Janmasthan complex — the prison cell itself, then Keshav Dev — and Dwarkadhish, built in 1814 and still the busiest darshan in the city. Round the four Mahadev temples that guard Mathura at its corners, then down to Vishram Ghat where Krishna rested after killing Kansa, for the evening Yamuna aarti.',
          stops: ['Mathura'],
          temples: [
            'Shri Krishna Janmasthan (Garbha Griha prison cell)',
            'Keshav Dev Temple',
            'Dwarkadhish Temple',
            'Bhuteshwar Mahadev',
            'Rangeshwar Mahadev',
            'Pippaleshwar Mahadev',
            'Gokarneshwar Mahadev',
            'Potara Kund',
            'Gita Mandir (Birla Mandir)',
            'Vishram Ghat — evening aarti',
            'Kans Qila',
          ],
        },
        {
          day: 2,
          title: 'Vrindavan: from Banke Bihari at opening to Nidhivan at dusk',
          detail:
            'Banke Bihari at the moment the gates open, which is the one hour of the day it is walkable. Then the Goswami temples on foot through the old lanes — Radha Raman, where the deity self-manifested from a shaligram; Radha Damodar with Rupa Goswami’s samadhi; Radha Vallabh; and Govind Dev Ji, seven storeys of red sandstone in 1590 before Aurangzeb took the top off. Rangji and Shahji after lunch, Prem Mandir and ISKCON in the late afternoon, and Nidhivan at dusk, when everyone leaves before dark.',
          stops: ['Vrindavan'],
          temples: [
            'Shri Banke Bihari Temple',
            'Shri Radha Raman Temple',
            'Radha Damodar Temple',
            'Radha Vallabh Temple',
            'Shri Govind Dev Ji Temple',
            'Madan Mohan Temple',
            'Shri Rangji Temple (Ranganatha)',
            'Shahji Temple',
            'Prem Mandir',
            'ISKCON Krishna Balaram Mandir',
            'Nidhivan and Rang Mahal',
            'Seva Kunj',
            'Gopeshwar Mahadev',
            'Katyayani Devi Shakti Peeth',
            'Kesi Ghat',
          ],
        },
        {
          day: 3,
          title: 'Gokul, Mahavan and Baldeo: where he was actually raised',
          detail:
            'Across the Yamuna to Gokul for the Gokulnath and Yamunaji temples, then Mahavan for the Chaurasi Khamba — Nand Bhavan, eighty-four pillars, the house Krishna grew up in. Raman Reti after that, where the sand is the point and children roll in it. Brahmand Ghat, where Yashoda looked into his mouth and saw the universe. Then 20 km to Baldeo for Dauji, the one temple in Braj where the elder brother, not Krishna, is the deity.',
          stops: ['Gokul'],
          temples: [
            'Gokulnath Temple, Gokul',
            'Yamunaji Temple, Gokul',
            'Chaurasi Khamba (Nand Bhavan), Mahavan',
            'Raman Reti',
            'Brahmand Ghat',
            'Chintaharan Mahadev',
            'Dauji Temple, Baldeo',
          ],
        },
        {
          day: 4,
          title: 'Barsana and Nandgaon: Radha’s hill and Krishna’s village',
          detail:
            'The Ladli Ji temple sits on Bhanugarh hill above Barsana — about 250 steps, or a palki if the group needs one, and we start early so it is done before the heat. Maan Mandir where Radha sulked, Kirti Mandir for her mother, Prem Sarovar and the narrow gorge at Sankari Khor. After lunch, 8 km to Nandgaon for the Nand Baba temple on Nandishwar hill, Pavan Sarovar and Yashoda Kund. Kokilavan for the Shani Dev darshan on the drive back if the day is running to time.',
          stops: ['Barsana', 'Nandgaon'],
          temples: [
            'Shri Ladli Ji Temple (Radha Rani), Barsana',
            'Maan Mandir',
            'Kirti Mandir',
            'Prem Sarovar',
            'Sankari Khor',
            'Nand Baba Temple, Nandgaon',
            'Pavan Sarovar',
            'Yashoda Kund',
            'Kokilavan Shani Dev Temple',
          ],
        },
        {
          day: 5,
          title: 'Govardhan: the hill, the kunds, and home',
          detail:
            'Daan Ghati at first light, then Mukharvind at Jatipura where the hill is worshipped as the face. Radha Kund and Shyam Kund, Kusum Sarovar in the morning light, Mansi Ganga and Haridev Ji. Groups doing the full 21 km parikrama start at 04:30 with our support vehicle shadowing them the whole way and a seat for anyone who needs one. Late lunch, then the drive back to Delhi or Noida.',
          stops: ['Govardhan'],
          temples: [
            'Daan Ghati Mandir',
            'Mukharvind, Jatipura',
            'Radha Kund and Shyam Kund',
            'Kusum Sarovar',
            'Mansi Ganga',
            'Haridev Ji Temple',
            'Punchhari ka Lautha',
            'Govardhan parikrama (21 km, optional)',
          ],
        },
      ],
    },
  ];

  const packageIds = [];
  for (const p of packageSeed) {
    packageIds.push(await insert('packages', {
      slug: p.slug, title: p.title, type: p.type, summary: p.summary, hero_image: null,
      itinerary: jsonParam(p.itinerary), duration_days: p.duration_days,
      inclusions: jsonParam(p.inclusions), exclusions: jsonParam(p.exclusions), base_camp: p.base_camp,
    }));
  }

  // ---- One completed trip, so reviews and "book again" have real data ----
  const pastTrip = (await query(
    `SELECT t.id, b.seat_layout FROM trips t JOIN buses b ON b.id = t.bus_id
     ORDER BY t.id LIMIT 1`
  ))[0];
  const bookingId = await insert('bookings', {
    reference: 'JMD-DEMO01', user_id: customer, trip_id: pastTrip.id,
    travel_date: new Date().toISOString().slice(0, 10),
    seats_booked: jsonParam(allSeats(json(pastTrip.seat_layout, {}))),
    party_size: 26,
    passengers: jsonParam([{ name: 'Demo Traveller', age: 32, gender: 'M' }]),
    pickup_point_id: pickupIds.Delhi[0], addons: jsonParam([]),
    booking_status: 'completed', qr_code: 'JMD-DEMO01',
  });

  await insert('reviews', {
    user_id: customer, booking_id: bookingId, trip_id: pastTrip.id, guide_id: guideIds[0],
    rating: 5,
    comment: 'Driver called the night before with the exact pickup spot. Guide knew which gate to use at Banke Bihari, saved us an hour in queue.',
    photos: jsonParam([]), verified_booking: true,
  });

  console.log(`Seeded on ${dialect}:`);
  console.log(`  ${guideIds.length} guides, ${buses.length} buses, ${routes.length} routes`);
  console.log(`  ${tripCount} trips over 14 days, ${packageIds.length} tours, ${pickups.length} pickup points`);
  console.log(`  ${rentalSeed.filter((r) => r.kind === 'car').length} cars, ` +
    `${rentalSeed.filter((r) => r.kind === 'bike').length} bikes, ` +
    `${rentalSeed.filter((r) => r.kind === 'room').length} room types`);
  console.log(`  Demo customer: 9812345678 | Admin: 9000000001 | password ${password}`);
  console.log('  OTP login works for any phone; in dev the code is returned by the API.');
}

seed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
