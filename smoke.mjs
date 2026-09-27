/**
 * Headless smoke test.
 *
 * Serves the classic-script build (dist-smoke) through Vite's preview server,
 * mounts every route in jsdom against the real API on :4000, and fails on a
 * console error or missing expected text. Catches the runtime breakage that a
 * successful build does not.
 *
 * Usage:
 *   node server/src/index.js &      # API on :4000
 *   npx vite build --config client/vite.smoke.config.js
 *   node smoke.mjs
 */
import { JSDOM, VirtualConsole } from 'jsdom';
import { preview } from 'vite';

const API = 'http://localhost:4000';
/** Staff password from the seed: demo1234 on local SQLite, the printed one on Postgres. */
const STAFF_PASSWORD = process.env.STAFF_PASSWORD || 'demo1234';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(phone, password) {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });
  if (!res.ok) throw new Error(`login failed for ${phone}`);
  return (await res.json()).token;
}

async function otpLogin(phone) {
  const post = (p, b) => fetch(`${API}${p}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b),
  }).then((r) => r.json());
  const { devCode } = await post('/api/auth/otp/request', { phone });
  const { token } = await post('/api/auth/otp/verify', { phone, code: devCode });
  return token;
}

async function loadRoute(base, route, token, expects = [], lang = null) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push(`jsdom: ${e.message}`));
  vc.on('error', (...a) => errors.push(`console.error: ${a.join(' ')}`));

  const dom = await JSDOM.fromURL(`${base}${route}`, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(window) {
      // Seed the session before the app boots, and proxy /api to the real server.
      if (token) window.localStorage.setItem('braj.token', token);
      if (lang) window.localStorage.setItem('jmd.lang', lang);
      const realFetch = fetch;
      window.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : input.url;
        return realFetch(url.startsWith('/api') ? `${API}${url}` : url, init);
      };
      window.matchMedia ||= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    },
  });

  // Poll until the page has settled on its expected content, not merely
  // until it is non-empty: several pages show a spinner first.
  for (let i = 0; i < 60; i += 1) {
    await sleep(150);
    const t = dom.window.document.body.textContent || '';
    if (t.length > 300 && expects.every((e) => t.includes(e))) break;
  }
  const text = dom.window.document.body.textContent || '';
  dom.window.close();
  return { text, errors };
}

const server = await preview({
  root: 'client',
  build: { outDir: 'dist-smoke' },
  preview: { port: 4180, strictPort: true },
});
const base = 'http://localhost:4180';

// Tokens for the role-gated pages.
const tokens = {
  customer: await otpLogin('9812345678'),
  guide: await login('9000000021', STAFF_PASSWORD),
  driver: await login('9000000012', STAFF_PASSWORD),
  admin: await login('9000000001', STAFF_PASSWORD),
};

// A real reference so the ticket page has something to render. It has to be a
// confirmed one: the confirmation screen is about a trip HQ has agreed to, and
// the demo customer also carries open enquiries that have no ticket yet.
const ref = await fetch(`${API}/api/bookings`, {
  headers: { authorization: `Bearer ${tokens.customer}` },
}).then((r) => r.json()).then((d) => {
  const all = [...(d.upcoming ?? []), ...(d.past ?? [])];
  const found = all.find((b) => b.confirmed) ?? all[0];
  if (!found) throw new Error('the demo customer has no bookings; reseed the demo data');
  return found.reference;
});

/** The first day with a whole bus free for this group, so the tests are not
 *  broken simply by the demo fleet being chartered. */
async function firstFreeDay(from, to, passengers) {
  const r = await fetch(
    `${API}/api/trips/availability?from=${from}&to=${to}&passengers=${passengers}&days=14`
  ).then((x) => x.json());
  const day = r.days.find((d) => d.free > 0);
  if (!day) throw new Error(`no ${from}-${to} departure is free for ${passengers}; reseed the demo data`);
  return day.date;
}

const tomorrow = await firstFreeDay('Delhi', 'Mathura', 12);

const ROUTES = [
  ['/', null, ['Choose your language', 'हिन्दी', 'Hire the whole bus', 'Complete Braj Darshan', 'Krishna and the Mughals', 'Our office in Vrindavan',
             'All India Permit buses',
             // Named temples are the point of this package; assert a few by name.
             'Shri Krishna Janmasthan', 'Dwarkadhish Temple', 'Shri Banke Bihari Temple',
             'Fatehpur Sikri', 'Sheikh Salim Chishti Dargah',
             'Shri Radha Raman Temple', 'Chaurasi Khamba', 'Dauji Temple, Baldeo',
             'Shri Ladli Ji Temple', 'Nand Baba Temple', 'Daan Ghati Mandir', 'Kusum Sarovar']],
  ['/packages/complete-braj-darshan-5d', null,
   ['Complete Braj Darshan', 'Day by day', 'Where you go', 'Request this trip',
    'Temples and sites on this day', 'Prem Mandir', 'Radha Kund and Shyam Kund']],
  [`/search?from=Delhi&to=Mathura&passengers=12&date=${tomorrow}`, null, ['Filters', 'Sort', 'Request this bus', 'whole bus', 'Date']],
  ['/packages', null, ['Our tours', 'Complete Braj Darshan', 'Krishna and the Mughals']],
  ['/packages/mathura-agra-circuit-4d', null,
   ['Krishna and the Mughals', 'Day by day', 'Where you go', 'Request this trip',
    'Taj Mahal at sunrise', 'Buland Darwaza', 'Keoladeo Ghana National Park', 'Deeg Palace and Gopal Bhavan']],
  ['/cars', null, ['Cars with a driver', 'Toyota Innova Crysta', 'Driver included', 'Pick-up date']],
  ['/bikes', null, ['Bikes and scooters', 'Honda Activa 6G', 'helmets included']],
  ['/stays', null, ['Rooms and stays', 'Dormitory Bed', 'Check-in']],
  ['/hire/1', null, ['The details', 'What you get', 'Request this', 'Cancellation']],
  ['/guides', null, ['Local guides', 'Verified in person']],
  ['/guides/1', null, ['Ready-made itineraries']],
  ['/login', null, ['Sign in']],
  ['/track/1', null, ['Your bus', 'Stops on this route']],
  ['/destinations', null, ['Where we run', 'Mathura', 'Ayodhya', 'Bharatpur']],
  ['/destinations/mathura', null,
   ['Tourism services in Mathura', 'What we run in Mathura', 'Shri Krishna Janmasthan',
    'Getting there', 'Find a bus to Mathura']],
  ['/destinations/ayodhya', null,
   ['Tourism services in Ayodhya', 'Ram Janmabhoomi', 'Hanuman Garhi', 'overnight']],
  ['/about', null, ['About us', 'The plain facts', 'All India Tourist Permit']],
  ['/contact', null, ['Contact us', '+91 79064 27172', '+91 89232 35591', 'Head office',
                      'Behind Prem Mandir', 'Sunrakh Road', 'Vrindavan', '281121']],
  ['/tracker', null, ['Live trip tracker', 'Booking reference', 'Track it']],
  ['/profile', 'customer', ['Your profile', 'Loyalty points', 'referral code']],
  ['/nope', null, ['404']],
  ['/my-trips', 'customer', ['My trips', 'points', 'Upcoming']],
  [`/confirmation/${ref}`, 'customer', ['Your trip is confirmed', 'Reference', 'Show at boarding']],
  ['/guide-portal', 'guide', ['Guide portal', 'Awaiting your reply', 'Your calendar']],
  ['/driver-portal', 'driver', ['Driver portal', 'sharing location']],
  ['/hq', 'admin', ['HQ Control Center', 'New enquiries', 'Enquiries']],
];

let failures = 0;
for (const [route, role, expects] of ROUTES) {
  try {
    const { text, errors } = await loadRoute(base, route, role ? tokens[role] : null, expects);
    const missing = expects.filter((e) => !text.includes(e));
    // Prices were removed from the whole product; catch any that creep back.
    const price = /₹|Rs\.?\s?\d/.test(text) ? ['a rupee figure is showing'] : [];
    // Illustrations replaced the placeholders; the apology must not return.
    if (/photo pending|not yet uploaded/i.test(text)) price.push('a "photo pending" placeholder is showing');
    if (/Station Road, Bhuteshwar|281001/.test(text)) price.push('the old office address is showing');
    // This bundle is a production build: the live site once printed HQ's
    // number and a password on the sign-in page for every visitor.
    if (/Demo accounts|demo1234/.test(text)) price.push('demo logins are showing in a production build');
    // WebSocket is unavailable in jsdom, so socket noise is expected here.
    const bad = errors.filter((e) => !/favicon|socket|websocket|ECONNREFUSED|not implemented/i.test(e));
    if (missing.length || bad.length || price.length) {
      failures += 1;
      console.log(`FAIL ${route}${role ? ` [${role}]` : ''}`);
      if (missing.length) console.log(`  missing: ${missing.join(' | ')}`);
      if (price.length) console.log(`  ${price[0]}`);
      bad.slice(0, 3).forEach((e) => console.log(`  ${e.slice(0, 300)}`));
      console.log(`  got ${text.length} chars: ${text.slice(0, 200).replace(/\s+/g, ' ')}`);
    } else {
      console.log(`ok   ${route}${role ? ` [${role}]` : ''}  (${text.length} chars)`);
    }
  } catch (e) {
    failures += 1;
    console.log(`FAIL ${route} — ${e.message}`);
  }
}

// --- the language switch itself ------------------------------------------
try {
  const hi = await loadRoute(base, '/', null, ['बसें', 'यात्राएँ'], 'hi');
  const missing = ['बसें', 'कारें', 'यात्राएँ', 'गाइड', 'मेरी यात्राएँ']
    .filter((w) => !hi.text.includes(w));
  if (missing.length) throw new Error('Hindi nav missing: ' + missing.join(' '));
  // A returning visitor who has already chosen must not be asked again.
  if (hi.text.includes('Choose your language') || hi.text.includes('अपनी भाषा चुनें')) {
    throw new Error('the language dialog reappeared for a returning visitor');
  }
  if (!hi.text.includes('पूरी बस किराए पर लें')) throw new Error('Hindi hero missing');
  console.log('ok   language switch: nav, hero and menu render in Hindi, dialog stays shut');

  // Every scheduled language must be offered, and each must actually switch.
  const first = await loadRoute(base, '/', null, ['Choose your language']);
  for (const native of ['हिन्दी', 'বাংলা', 'தமிழ்', 'తెలుగు', 'ಕನ್ನಡ', 'മലയാളം',
                        'ગુજરાતી', 'ਪੰਜਾਬੀ', 'ଓଡ଼ିଆ', 'اردو', 'অসমীয়া', 'ᱥᱟᱱᱛᱟᱲᱤ',
                        'ꯃꯤꯇꯩꯂꯣꯟ', 'کٲشُر', 'बर’', 'संस्कृतम्']) {
    if (!first.text.includes(native)) throw new Error('picker missing ' + native);
  }
  console.log('ok   language picker offers all 22 scheduled languages plus English');

  const checks = [['ta', 'பேருந்துகள்'], ['bn', 'বাস'], ['ur', 'بسیں'], ['ml', 'ബസുകൾ']];
  for (const [code, word] of checks) {
    const r = await loadRoute(base, '/', null, [word], code);
    if (!r.text.includes(word)) throw new Error(code + ' did not switch the navigation');
  }
  console.log('ok   Tamil, Bengali, Urdu and Malayalam each switch the navigation');
} catch (e) {
  failures += 1;
  console.log('FAIL language switch — ' + e.message);
}

// --- crawler files and per-page metadata ---------------------------------
try {
  const robots = await fetch(`${API}/robots.txt`).then((r) => r.text());
  if (!/^User-agent: \*/m.test(robots)) throw new Error('robots.txt is not served');
  if (!/Disallow: \/hq/.test(robots)) throw new Error('robots.txt does not shield the staff console');
  if (!/Sitemap: /.test(robots)) throw new Error('robots.txt does not point at the sitemap');

  const sitemap = await fetch(`${API}/sitemap.xml`).then((r) => r.text());
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  for (const must of ['/destinations/mathura', '/destinations/ayodhya', '/cars', '/bikes', '/stays']) {
    if (!locs.some((l) => l.endsWith(must))) throw new Error('sitemap is missing ' + must);
  }
  if (locs.length < 30) throw new Error('sitemap looks too short: ' + locs.length);
  console.log(`ok   robots.txt and sitemap.xml (${locs.length} urls, generated from the database)`);
} catch (e) {
  failures += 1;
  console.log('FAIL crawler files — ' + e.message);
}

try {
  // Each page must carry its own title, description and canonical, or a
  // search engine has nothing to tell the routes apart.
  const seen = new Map();
  for (const route of ['/', '/destinations/mathura', '/destinations/agra', '/cars', '/stays', '/packages']) {
    const dom = await JSDOM.fromURL(`${base}${route}`, {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
      beforeParse(w) {
        const rf = fetch;
        w.fetch = (i, init) => { const u = typeof i === 'string' ? i : i.url; return rf(u.startsWith('/api') ? API + u : u, init); };
        w.matchMedia ||= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
      },
    });
    for (let i = 0; i < 40; i += 1) {
      await sleep(150);
      if (dom.window.document.querySelector('link[rel="canonical"]')) break;
    }
    const d = dom.window.document;
    const title = d.title;
    const desc = d.querySelector('meta[name="description"]')?.content ?? '';
    const canon = d.querySelector('link[rel="canonical"]')?.href ?? '';
    const ld = [...d.querySelectorAll('script[type="application/ld+json"]')].length;
    dom.window.close();
    if (!title || !desc || !canon) throw new Error(route + ' is missing title, description or canonical');
    if (!ld) throw new Error(route + ' has no structured data');
    if (seen.has(title)) throw new Error(`${route} reuses the title of ${seen.get(title)}`);
    seen.set(title, route);
  }
  console.log('ok   every public page has its own title, description, canonical and JSON-LD');
} catch (e) {
  failures += 1;
  console.log('FAIL page metadata — ' + e.message);
}

// --- phone readiness -------------------------------------------------------
try {
  const manifest = await fetch(`${base}/manifest.webmanifest`).then((r) => r.json());
  for (const k of ['name', 'short_name', 'start_url', 'display', 'theme_color', 'icons']) {
    if (!manifest[k]) throw new Error('manifest is missing ' + k);
  }
  if (manifest.display !== 'standalone') throw new Error('manifest does not install standalone');
  if (!manifest.icons.some((i) => i.purpose === 'maskable')) {
    throw new Error('manifest has no maskable icon, so Android will letterbox it');
  }
  const icon = await fetch(`${base}${manifest.icons[0].src}`);
  if (!icon.ok) throw new Error('manifest icon 404s');
  console.log('ok   installable on a phone: manifest, standalone display, maskable icon');
} catch (e) {
  failures += 1;
  console.log('FAIL phone install — ' + e.message);
}

try {
  // Render narrow and check the pieces a phone depends on are really there.
  const dom = await JSDOM.fromURL(base, {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
    beforeParse(w) {
      Object.defineProperty(w, 'innerWidth', { value: 360, configurable: true });
      Object.defineProperty(w, 'innerHeight', { value: 740, configurable: true });
      const rf = fetch;
      w.fetch = (i, init) => { const u = typeof i === 'string' ? i : i.url; return rf(u.startsWith('/api') ? API + u : u, init); };
      w.matchMedia ||= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    },
  });
  for (let i = 0; i < 45; i += 1) {
    await sleep(150);
    if (dom.window.document.querySelector('nav[aria-label]')) break;
  }
  const d = dom.window.document;

  const viewport = d.querySelector('meta[name="viewport"]')?.content ?? '';
  if (!/width=device-width/.test(viewport)) throw new Error('no responsive viewport');
  if (/user-scalable=no|maximum-scale=1/.test(viewport)) throw new Error('viewport blocks pinch zoom');

  const tabs = [...d.querySelectorAll('a')].filter((a) =>
    a.className.includes('h-[3.75rem]'));
  if (tabs.length < 5) throw new Error('bottom tab bar did not render, saw ' + tabs.length);

  // Anything wide must live inside something that scrolls sideways.
  const wide = [...d.querySelectorAll('[class*="min-w-["]')];
  for (const el of wide) {
    let n = el.parentElement, ok = false;
    while (n && n !== d.body) {
      if ((n.className || '').includes('overflow-x-auto')) { ok = true; break; }
      n = n.parentElement;
    }
    if (!ok) throw new Error('a wide element is not inside a horizontal scroller: ' + el.className.slice(0, 60));
  }

  // Phone numbers must be tappable, not just printed.
  const tel = [...d.querySelectorAll('a[href^="tel:"]')].length;
  const wa = [...d.querySelectorAll('a[href*="wa.me"]')].length;
  if (!tel || !wa) throw new Error(`expected tap-to-call and WhatsApp links, saw ${tel} and ${wa}`);

  dom.window.close();
  console.log(`ok   phone layout at 360px: viewport, ${tabs.length}-tab bottom bar, zoom allowed, ${tel} call and ${wa} WhatsApp links`);
} catch (e) {
  failures += 1;
  console.log('FAIL phone layout — ' + e.message);
}

// --- builder credit --------------------------------------------------------
try {
  const dom = await JSDOM.fromURL(base, {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
    beforeParse(w) {
      const rf = fetch;
      w.fetch = (i, init) => { const u = typeof i === 'string' ? i : i.url; return rf(u.startsWith('/api') ? API + u : u, init); };
      w.matchMedia ||= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    },
  });
  for (let i = 0; i < 45; i += 1) {
    await sleep(150);
    if (dom.window.document.querySelector('a[href*="bajrangassociate"]')) break;
  }
  const d = dom.window.document;
  const link = d.querySelector('a[href*="bajrangassociate.com"]');
  if (!link) throw new Error('the Powered by BA link is missing');
  if (!/powered by ba/i.test(link.textContent)) throw new Error('the credit does not read Powered by BA');
  if (link.target !== '_blank') throw new Error('the credit does not open in a new tab');
  if (!/noreferrer|noopener/.test(link.rel)) throw new Error('the credit is missing rel=noreferrer');

  const text = d.body.textContent || '';
  if (!/made in bharat/i.test(text)) throw new Error('Made in Bharat is missing');
  if (!d.querySelector('svg[aria-label="India"]')) throw new Error('the tricolour is missing');
  dom.window.close();
  console.log('ok   credit: Powered by BA links out to bajrangassociate.com, Made in Bharat with the tricolour');
} catch (e) {
  failures += 1;
  console.log('FAIL builder credit — ' + e.message);
}

await server.close();
console.log(failures ? `\n${failures} route(s) failed` : `\nAll ${ROUTES.length} routes rendered`);
process.exit(failures ? 1 : 0);
