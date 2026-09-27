/**
 * Click-through test of the request journey, the flow the product is judged on:
 * search -> pick a bus -> group size -> lead passenger -> add a guide ->
 * send request -> HQ quotes and confirms -> QR ticket appears.
 *
 * Drives the real UI in jsdom against the real API, so it exercises router
 * state hand-off, the no-prices-anywhere rule, and the rule that an open
 * enquiry must not lock a vehicle while a confirmed one must.
 */
import { JSDOM, VirtualConsole } from 'jsdom';
import { preview } from 'vite';

const API = 'http://localhost:4000';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await preview({
  root: 'client',
  build: { outDir: 'dist-smoke' },
  preview: { port: 4181, strictPort: true },
});

const post = (p, b, token) => fetch(`${API}${p}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
  body: JSON.stringify(b ?? {}),
}).then((r) => r.json());

const { devCode } = await post('/api/auth/otp/request', { phone: '9812345678' });
const { token } = await post('/api/auth/otp/verify', { phone: '9812345678', code: devCode });
const { token: adminToken } = await post('/api/auth/login', { phone: '9000000001', password: 'demo1234' });

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => errors.push(e.message));
vc.on('error', (...a) => errors.push(a.join(' ')));

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

const PARTY = 18;
const tomorrow = await firstFreeDay('Delhi', 'Mathura', PARTY);
const start = `/search?from=Delhi&to=Mathura&passengers=${PARTY}&date=${tomorrow}`;

const dom = await JSDOM.fromURL(`http://localhost:4181${start}`, {
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  virtualConsole: vc,
  beforeParse(window) {
    window.localStorage.setItem('braj.token', token);
    const realFetch = fetch;
    window.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : input.url;
      return realFetch(url.startsWith('/api') ? `${API}${url}` : url, init);
    };
    window.matchMedia ||= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    window.scrollTo ||= () => {};
    window.confirm = () => true;
  },
});
const { window } = dom;
const doc = window.document;
const text = () => doc.body.textContent || '';

async function until(label, fn, tries = 60) {
  for (let i = 0; i < tries; i += 1) {
    await sleep(150);
    const v = fn();
    if (v) return v;
  }
  throw new Error(`timed out waiting for: ${label}\n  page said: ${text().slice(0, 240)}`);
}

const click = (el) => {
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
};

const setValue = (el, value) => {
  const proto = el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
  el.dispatchEvent(new window.Event('change', { bubbles: true }));
};

const byText = (sel, re) => [...doc.querySelectorAll(sel)].find((e) => re.test(e.textContent || ''));
const firstOption = (sel) => [...sel.options].find((o) => o.value)?.value;
/** No rupee figure may appear anywhere in the customer journey. */
const assertNoPrices = (where) => {
  if (/₹|Rs\.?\s?\d/.test(text())) throw new Error(`a price is showing on ${where}`);
};

const steps = [];
const step = (name) => { steps.push(name); console.log(`  ✓ ${name}`); };

try {
  console.log('Request journey:');

  const firstBook = await until('search results', () => byText('a', /Request this bus/));
  assertNoPrices('search results');
  step(`search returned buses, no prices shown (${doc.querySelectorAll('a').length} links)`);

  // The date field is a calendar popover that knows what is actually free.
  const dateBtn = await until('date field', () => doc.querySelector('#sb-date'));
  const labelBefore = dateBtn.textContent.trim();
  click(dateBtn);
  const grid = await until('calendar grid', () => doc.querySelector('[role="grid"]'));
  const dayCells = [...grid.querySelectorAll('button[data-iso]')];
  if (dayCells.length < 28) throw new Error(`calendar rendered ${dayCells.length} days`);
  const openDays = dayCells.filter((b) => !b.disabled);
  const shutDays = dayCells.filter((b) => b.disabled);
  if (!openDays.length) throw new Error('calendar offered no bookable day');
  if (!shutDays.length) throw new Error('calendar marked no day unavailable');
  // Every open day must really have a bus free for this group.
  const availability = await fetch(
    `${API}/api/trips/availability?from=Delhi&to=Mathura&passengers=${PARTY}&days=60`
  ).then((r) => r.json());
  const freeDays = new Set(availability.days.filter((d) => d.free > 0).map((d) => d.date));
  const wrong = openDays.find((b) => !freeDays.has(b.dataset.iso));
  if (wrong) throw new Error(`calendar offered ${wrong.dataset.iso}, which has no bus free`);
  const pick = openDays.find((b) => b.dataset.iso === tomorrow) ?? openDays[0];
  click(pick);
  await until('calendar closed', () => !doc.querySelector('[role="grid"]'));
  if (doc.querySelector('#sb-date').textContent.trim() === labelBefore && pick.dataset.iso !== tomorrow) {
    throw new Error('picking a date did not update the field');
  }
  step(`calendar: ${dayCells.length} days, ${openDays.length} bookable, ${shutDays.length} greyed out; picked ${pick.dataset.iso}`);

  click(firstBook);
  await until('charter detail', () => text().includes('The whole bus is yours'));
  assertNoPrices('the bus page');
  if (/Pick your seats/.test(text())) throw new Error('seat picker still present');
  step('opened bus detail: seat plan, no seat picker, no price');

  const party = await until('party size field', () => doc.querySelector('#party'));
  setValue(party, String(PARTY));
  const pickup = doc.querySelector('#pickup');
  setValue(pickup, firstOption(pickup));
  step(`set group size ${PARTY} and a boarding point`);

  const cont = await until('continue button', () =>
    [...doc.querySelectorAll('button')].find((b) => /Continue to details/.test(b.textContent) && !b.disabled));
  click(cont);
  await until('group step', () => text().includes('Who is in charge of the group?'));
  step('reached step 1: group details');

  const nameInput = await until('lead name field', () =>
    doc.querySelector('input[placeholder="Lead passenger name"]'));
  setValue(nameInput, 'Asha Verma');
  setValue(doc.querySelector('input[placeholder="Age"]'), '41');
  setValue(doc.querySelector('#party'), String(PARTY));
  setValue(doc.querySelector('#ph'), '9812345678');
  const pick2 = doc.querySelector('#pick');
  if (pick2) setValue(pick2, firstOption(pick2));
  step('filled lead passenger, head count and contact');

  const next = await until('enabled continue', () =>
    [...doc.querySelectorAll('button')].find((b) => /Continue to add-ons/.test(b.textContent) && !b.disabled));
  click(next);
  await until('add-ons step', () => text().includes('Add a local guide'));
  assertNoPrices('the add-ons step');
  step('reached step 2: add-ons, priced nowhere');

  const guideBtn = await until('guide itinerary', () =>
    [...doc.querySelectorAll('button[aria-pressed]')].find((b) => /Half-day|Full-day|parikrama|dawn|ridge/.test(b.textContent)));
  click(guideBtn);
  step(`added guide itinerary: ${guideBtn.textContent.trim()}`);

  const sendBtn = await until('send button', () =>
    [...doc.querySelectorAll('button')].find((b) => /Send this request/.test(b.textContent) && !b.disabled));
  click(sendBtn);

  await until('request received', () => text().includes('Request received'), 90);
  assertNoPrices('the confirmation page');
  if (doc.querySelector('img[alt^="QR ticket"]')) {
    throw new Error('a QR ticket was issued before the office confirmed');
  }
  const ref = (text().match(/JMD-[A-Z0-9]{7}/) ?? [])[0];
  if (!ref) throw new Error('no reference on the confirmation page');
  step(`request sent: ${ref}, no ticket issued yet`);

  // An open enquiry must NOT take the vehicle off the board.
  const booked = await fetch(`${API}/api/bookings/${ref}`, {
    headers: { authorization: `Bearer ${token}` },
  }).then((r) => r.json()).then((d) => d.booking);
  const stillOpen = await fetch(
    `${API}/api/trips/search?from=Delhi&to=Mathura&date=${tomorrow}&passengers=${PARTY}`
  ).then((r) => r.json());
  if (!stillOpen.trips.some((t) => t.id === booked.trip.id)) {
    throw new Error('an unconfirmed enquiry locked the vehicle');
  }
  step('open enquiry did not lock the bus for anyone else');

  // HQ quotes, then confirms.
  await post(`/api/admin/enquiries/${ref}/quote`, {}, adminToken);
  const confirmRes = await post(`/api/admin/enquiries/${ref}/confirm`, {}, adminToken);
  if (confirmRes.status !== 'confirmed') throw new Error('HQ confirm failed: ' + JSON.stringify(confirmRes));
  step('HQ marked it quoted, then confirmed');

  const after = await fetch(`${API}/api/bookings/${ref}`, {
    headers: { authorization: `Bearer ${token}` },
  }).then((r) => r.json()).then((d) => d.booking);
  if (!after.confirmed) throw new Error('booking not confirmed');
  if (!after.qrDataUrl?.startsWith('data:image')) throw new Error('no QR ticket after confirmation');
  if (after.partySize !== PARTY) throw new Error(`party size ${after.partySize}, expected ${PARTY}`);
  step(`ticket issued on confirmation: whole bus, ${after.capacity} seats, party of ${after.partySize}`);

  const nowGone = await fetch(
    `${API}/api/trips/search?from=Delhi&to=Mathura&date=${tomorrow}&passengers=${PARTY}`
  ).then((r) => r.json());
  if (nowGone.trips.some((t) => t.id === booked.trip.id)) {
    throw new Error('confirmed bus is still offered in search');
  }
  step('confirmed bus removed from search for everyone else');

  const real = errors.filter((e) => !/socket|websocket|favicon|not implemented|ECONNREFUSED/i.test(e));
  if (real.length) throw new Error(`console errors: ${real.slice(0, 2).join(' | ')}`);

  console.log(`\nRequest journey passed (${steps.length} steps).`);
  await server.close();
  process.exit(0);
} catch (e) {
  console.log(`\nFAILED after ${steps.length} steps: ${e.message}`);
  await server.close();
  process.exit(1);
}
